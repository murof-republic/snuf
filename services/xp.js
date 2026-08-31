const { getMembersCollection } = require('./firebase');

// Configurações

const MESSAGE_XP_MIN = 5;
const MESSAGE_XP_MAX = 15;

const VOICE_XP_MIN = 5;
const VOICE_XP_MAX = 10;

const VOICE_INTERVAL = 60 * 1000;

const SAVE_MESSAGE_COUNT = 10;
const SAVE_INTERVAL = 5 * 60 * 1000;

const XP_PER_LEVEL = 1000;


// Cache

const users = new Map();


// Funções

function randomXP(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getLevel(xp) {
	return Math.floor(xp / XP_PER_LEVEL);
}


// Carregar usuário

async function getUserCache(userId, guildId) {
	let user = users.get(userId);

	if (!user) {
		user = {
			globalXP: 0,
			guilds: new Map(),
			messageCount: 0,
			lastSave: Date.now(),
			voice: null,
			loaded: false
		};

		users.set(userId, user);
	}

	if (!user.guilds.has(guildId)) {
		user.guilds.set(guildId, {
			xp: 0
		});
	}

	if (!user.loaded) {
		try {
			const members = getMembersCollection();
			const snapshot = await members.doc(userId).get();

			if (snapshot.exists) {
				const data = snapshot.data();

				user.globalXP =
					typeof data.xpGlobal === 'number'
						? data.xpGlobal
						: 0;

				for (const [serverId, serverData] of Object.entries(
					data.servers || {}
				)) {
					user.guilds.set(serverId, {
						xp:
							typeof serverData?.xp === 'number'
								? serverData.xp
								: 0
					});
				}
			}

			user.loaded = true;

		} catch (error) {
			console.error(
				`Erro ao carregar XP do usuário ${userId}:`,
				error
			);

			return null;
		}
	}

	return user;
}


// XP

function addXP(userId, guildId, amount, channel) {
	const user = users.get(userId);

	if (!user) return 0;

	const guild = user.guilds.get(guildId);

	if (!guild) return 0;

	const oldLevel = getLevel(guild.xp);

	user.globalXP += amount;
	guild.xp += amount;

	const newLevel = getLevel(guild.xp);

	user.messageCount++;

	if (newLevel > oldLevel && channel) {
		channel.send(
			`Parabéns <@${userId}>, você subiu para o nível ${newLevel}! <a:hackerbongocat:1473553251109568583>`
		).catch(error => {
			console.error(
				'Erro ao enviar mensagem de level up:',
				error
			);
		});
	}

	return amount;
}


// XP por mensagem

async function handleMessage(message) {
	if (!message.guild) return;
	if (message.author.bot) return;

	const userId = message.author.id;
	const guildId = message.guild.id;

	const user = await getUserCache(
		userId,
		guildId
	);

	if (!user) return 0;

	const amount = randomXP(
		MESSAGE_XP_MIN,
		MESSAGE_XP_MAX
	);

	addXP(
		userId,
		guildId,
		amount,
		message.channel
	);

	if (
		user.messageCount >= SAVE_MESSAGE_COUNT ||
		Date.now() - user.lastSave >= SAVE_INTERVAL
	) {
		await saveUser(userId);
	}

	return amount;
}


// Firebase

async function saveUser(userId) {
	const user = users.get(userId);

	if (!user || !user.loaded) return;

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


// Voz

async function handleVoiceStateUpdate(oldState, newState) {
	const member = newState.member || oldState.member;

	if (!member) return;
	if (member.user.bot) return;

	const guild = newState.guild || oldState.guild;

	if (!guild) return;

	const userId = member.id;
	const guildId = guild.id;

	const user = await getUserCache(
		userId,
		guildId
	);

	if (!user) return;

	if (!oldState.channelId && newState.channelId) {
		user.voice = {
			guildId,
			channelId: newState.channelId,
			lastXP: Date.now()
		};

		return;
	}

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

	if (oldState.channelId && !newState.channelId) {
		user.voice = null;

		await saveUser(userId);
	}
}


// XP de voz

async function processVoiceXP(client) {
	for (const [userId, user] of users) {
		if (!user.loaded) continue;
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
			amount,
			channel
		);

		if (
			user.messageCount >= SAVE_MESSAGE_COUNT ||
			now - user.lastSave >= SAVE_INTERVAL
		) {
			await saveUser(userId);
		}
	}
}


// Iniciar voz

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


// Salvar tudo

async function saveAll() {
	for (const userId of users.keys()) {
		await saveUser(userId);
	}
}


// XP em cache

function getCachedXP(userId, guildId) {
	const user = users.get(userId);

	if (!user || !user.loaded) return null;

	const guild = user.guilds.get(guildId);

	if (!guild) return null;

	return {
		globalXP: user.globalXP,
		xp: guild.xp
	};
}


module.exports = {
	handleMessage,
	handleVoiceStateUpdate,
	startVoiceXP,
	saveAll,
	getCachedXP,
	XP_PER_LEVEL
};