const { getMembersCollection } = require('../services/firebase');

// XP por mensagem
const MESSAGE_XP_MIN = 5;
const MESSAGE_XP_MAX = 15;
const MESSAGE_COOLDOWN = 10 * 1000;

// XP por voz
const VOICE_XP_MIN = 5;
const VOICE_XP_MAX = 10;
const VOICE_INTERVAL = 60 * 1000;

// Salvamento
const SAVE_MESSAGE_COUNT = 10;
const SAVE_INTERVAL = 5 * 60 * 1000;

const XP_PER_LEVEL = 1000;

const users = new Map();

function randomXP(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getUserCache(userId, guildId) {
	let user = users.get(userId);

	if (!user) {
		user = {
			globalXP: 0,
			guilds: new Map(),
			messageCount: 0,
			lastMessageXP: 0,
			lastSave: Date.now(),
			voice: null
		};

		users.set(userId, user);
	}

	if (!user.guilds.has(guildId)) {
		user.guilds.set(guildId, {
			xp: 0
		});
	}

	return user;
}

function addXP(userId, guildId, amount) {
	const user = getUserCache(userId, guildId);
	const guild = user.guilds.get(guildId);

	user.globalXP += amount;
	guild.xp += amount;

	user.messageCount++;

	return amount;
}

async function handleMessage(message) {
	if (!message.guild) return;
	if (message.author.bot) return;

	const userId = message.author.id;
	const guildId = message.guild.id;

	const user = getUserCache(userId, guildId);
	const now = Date.now();

	if (now - user.lastMessageXP < MESSAGE_COOLDOWN) {
		return 0;
	}

	user.lastMessageXP = now;

	const amount = randomXP(
		MESSAGE_XP_MIN,
		MESSAGE_XP_MAX
	);

	addXP(userId, guildId, amount);

	if (
		user.messageCount >= SAVE_MESSAGE_COUNT ||
		now - user.lastSave >= SAVE_INTERVAL
	) {
		await saveUser(userId);
	}

	return amount;
}

async function saveUser(userId) {
	const user = users.get(userId);

	if (!user) return;

	try {
		const members = getMembersCollection();

		const data = {
			xpGlobal: user.globalXP
		};

		for (const [guildId, guild] of user.guilds) {
			data[`servers.${guildId}.xp`] = guild.xp;
		}

		await members.doc(userId).set(
			data,
			{ merge: true }
		);

		user.messageCount = 0;
		user.lastSave = Date.now();

	} catch (error) {
		console.error(
			`Erro ao salvar XP do usuário ${userId}:`,
			error
		);
	}
}

async function handleVoiceStateUpdate(oldState, newState) {
	const member = newState.member || oldState.member;

	if (!member) return;
	if (member.user.bot) return;

	const guild = newState.guild || oldState.guild;

	if (!guild) return;

	const userId = member.id;
	const guildId = guild.id;

	const user = getUserCache(userId, guildId);

	// Entrou
	if (!oldState.channelId && newState.channelId) {
		user.voice = {
			guildId,
			channelId: newState.channelId,
			lastXP: Date.now()
		};

		return;
	}

	// Mudou de canal
	if (
		oldState.channelId &&
		newState.channelId &&
		oldState.channelId !== newState.channelId
	) {
		user.voice = {
			guildId,
			channelId: newState.channelId,
			lastXP: Date.now()
		};

		return;
	}

	// Saiu
	if (oldState.channelId && !newState.channelId) {
		user.voice = null;

		await saveUser(userId);
	}
}

async function processVoiceXP(client) {
	for (const [userId, user] of users) {
		if (!user.voice) continue;

		const guild = client.guilds.cache.get(
			user.voice.guildId
		);

		if (!guild) continue;

		const channel = guild.channels.cache.get(
			user.voice.channelId
		);

		if (!channel) continue;

		const humans = channel.members.filter(
			member => !member.user.bot
		);

		// Sozinho não ganha
		if (humans.size < 2) continue;

		const now = Date.now();

		if (now - user.voice.lastXP < VOICE_INTERVAL) {
			continue;
		}

		user.voice.lastXP = now;

		const amount = randomXP(
			VOICE_XP_MIN,
			VOICE_XP_MAX
		);

		addXP(
			userId,
			user.voice.guildId,
			amount
		);

		if (
			user.messageCount >= SAVE_MESSAGE_COUNT ||
			now - user.lastSave >= SAVE_INTERVAL
		) {
			await saveUser(userId);
		}
	}
}

function startVoiceXP(client) {
	setInterval(() => {
		processVoiceXP(client).catch(error => {
			console.error(
				'Erro ao processar XP de voz:',
				error
			);
		});
	}, 10 * 1000);
}

async function saveAll() {
	for (const userId of users.keys()) {
		await saveUser(userId);
	}
}

module.exports = {
	handleMessage,
	handleVoiceStateUpdate,
	startVoiceXP,
	saveAll,
	XP_PER_LEVEL
};