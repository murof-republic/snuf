const { getMembersCollection } = require('./firebase');

const MESSAGE_XP_MIN = 5;
const MESSAGE_XP_MAX = 15;

const VOICE_XP_MIN = 5;
const VOICE_XP_MAX = 10;

const VOICE_INTERVAL = 60 * 1000;
const VOICE_CHECK_INTERVAL = 10 * 1000;

const SAVE_MESSAGE_COUNT = 10;
const SAVE_INTERVAL = 5 * 60 * 1000;
const AUTO_SAVE_INTERVAL = 10 * 60 * 1000;

const XP_PER_LEVEL = 1000;

const users = new Map();
const voiceUsers = new Set();
const saveLocks = new Map();

function randomXP(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getLevel(xp) {
	return Math.floor(xp / XP_PER_LEVEL);
}

async function getUserCache(userId, guildId) {
	if (!userId || typeof userId !== 'string') {
		return null;
	}

	if (!guildId || typeof guildId !== 'string') {
		return null;
	}

	let user = users.get(userId);

	if (!user) {
		user = {
			globalXP: 0,
			guilds: new Map(),
			messageCount: 0,
			lastSave: Date.now(),
			voice: null,
			loaded: false,
			loading: false
		};

		users.set(userId, user);
	}

	if (!user.guilds.has(guildId)) {
		user.guilds.set(guildId, { xp: 0 });
	}

	if (user.loaded) {
		return user;
	}

	if (user.loading) {
		let attempts = 0;
		while (user.loading && attempts < 50) {
			await new Promise(resolve => setTimeout(resolve, 100));
			attempts++;
		}
		return user;
	}

	user.loading = true;

	try {
		const members = getMembersCollection();
		const snapshot = await members.doc(userId).get();

		if (snapshot.exists) {
			const data = snapshot.data();
			user.globalXP = typeof data.xpGlobal === 'number' ? data.xpGlobal : 0;

			if (data.servers && typeof data.servers === 'object') {
				for (const [serverId, serverData] of Object.entries(data.servers)) {
					if (serverData && typeof serverData.xp === 'number') {
						user.guilds.set(serverId, { xp: serverData.xp });
					}
				}
			}
		}

		user.loaded = true;
		return user;
	} catch (error) {
		console.error(`[XP] Erro ao carregar XP do usuário ${userId}:`, error);
		return null;
	} finally {
		user.loading = false;
	}
}

function addXP(userId, guildId, amount, channel) {
	const user = users.get(userId);

	if (!user || !user.loaded) {
		return 0;
	}

	const guild = user.guilds.get(guildId);

	if (!guild) {
		return 0;
	}

	if (typeof amount !== 'number' || amount <= 0) {
		return 0;
	}

	const oldLevel = getLevel(guild.xp);

	user.globalXP += amount;
	guild.xp += amount;

	const newLevel = getLevel(guild.xp);
	user.messageCount++;

	if (newLevel > oldLevel && channel) {
		channel.send(
			`Parabéns <@${userId}>, você subiu para o nível ${newLevel}! <a:hackerbongocat:1473553251109568583>`
		).catch(error => {
			console.error('[XP] Erro ao enviar mensagem de level up:', error.message);
		});
	}

	return amount;
}

async function handleMessage(message) {
	if (!message?.guild) return;
	if (message.author?.bot) return;
	if (!message.author?.id) return;

	const userId = message.author.id;
	const guildId = message.guild.id;

	try {
		const user = await getUserCache(userId, guildId);

		if (!user) {
			return 0;
		}

		const amount = randomXP(MESSAGE_XP_MIN, MESSAGE_XP_MAX);
		addXP(userId, guildId, amount, message.channel);

		if (
			user.messageCount >= SAVE_MESSAGE_COUNT ||
			Date.now() - user.lastSave >= SAVE_INTERVAL
		) {
			await saveUser(userId);
		}

		return amount;
	} catch (error) {
		console.error('[XP] Erro ao processar XP da mensagem:', error.message);
		return 0;
	}
}

async function saveUser(userId) {
	if (!userId || typeof userId !== 'string') {
		return false;
	}

	const user = users.get(userId);

	if (!user || !user.loaded) {
		return false;
	}

	if (saveLocks.get(userId)) {
		return false;
	}

	saveLocks.set(userId, true);

	try {
		const members = getMembersCollection();

		const data = {
			xpGlobal: Math.max(0, user.globalXP),
			servers: {}
		};

		for (const [guildId, guild] of user.guilds) {
			if (guildId && guild && typeof guild.xp === 'number') {
				data.servers[guildId] = {
					xp: Math.max(0, guild.xp)
				};
			}
		}

		await members.doc(userId).set(data, { merge: true });

		user.messageCount = 0;
		user.lastSave = Date.now();
		return true;
	} catch (error) {
		console.error(`[XP] Erro ao salvar XP do usuário ${userId}:`, error.message);
		return false;
	} finally {
		saveLocks.delete(userId);
	}
}

async function handleVoiceStateUpdate(oldState, newState) {
	const member = newState.member || oldState.member;

	if (!member) return;
	if (member.user?.bot) return;

	const guild = newState.guild || oldState.guild;
	if (!guild) return;

	const userId = member.id;
	const guildId = guild.id;

	try {
		const user = await getUserCache(userId, guildId);

		if (!user) return;

		if (!oldState.channelId && newState.channelId) {
			voiceUsers.add(userId);
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
			voiceUsers.add(userId);
			user.voice = {
				guildId,
				channelId: newState.channelId,
				lastXP: Date.now()
			};
			return;
		}

		if (oldState.channelId && !newState.channelId) {
			voiceUsers.delete(userId);
			user.voice = null;
			await saveUser(userId);
		}
	} catch (error) {
		console.error('[XP] Erro ao processar mudança de voz:', error.message);
	}
}

async function processVoiceXP(client) {
	if (!client) return;

	for (const userId of voiceUsers) {
		const user = users.get(userId);

		if (!user || !user.loaded || !user.voice) {
			voiceUsers.delete(userId);
			continue;
		}

		try {
			const guild = client.guilds.cache.get(user.voice.guildId);

			if (!guild) {
				voiceUsers.delete(userId);
				continue;
			}

			const channel = guild.channels.cache.get(user.voice.channelId);

			if (!channel || !channel.isVoiceBased()) {
				voiceUsers.delete(userId);
				continue;
			}

			const humans = channel.members.filter(member => !member.user.bot);

			if (humans.size < 2) {
				user.voice.lastXP = Date.now();
				continue;
			}

			const now = Date.now();

			if (now - user.voice.lastXP < VOICE_INTERVAL) {
				continue;
			}

			const amount = randomXP(VOICE_XP_MIN, VOICE_XP_MAX);
			addXP(userId, user.voice.guildId, amount, channel);
			user.voice.lastXP = now;

			if (
				user.messageCount >= SAVE_MESSAGE_COUNT ||
				now - user.lastSave >= SAVE_INTERVAL
			) {
				await saveUser(userId);
			}
		} catch (error) {
			console.error(`[XP] Erro ao processar XP de voz para ${userId}:`, error.message);
		}
	}
}

function startVoiceXP(client) {
	if (!client) {
		return;
	}

	setInterval(() => {
		processVoiceXP(client).catch(error => {
			console.error('[XP] Erro no loop de processamento de voz:', error.message);
		});
	}, VOICE_CHECK_INTERVAL);

	setInterval(() => {
		saveAll().catch(error => {
			console.error('[XP] Erro ao salvar todos os usuários:', error.message);
		});
	}, AUTO_SAVE_INTERVAL);
}

async function saveAll() {
	const userIds = Array.from(users.keys());

	if (userIds.length === 0) {
		return;
	}

	let saved = 0;
	let errors = 0;

	for (const userId of userIds) {
		const result = await saveUser(userId);
		if (result) {
			saved++;
		} else {
			errors++;
		}
	}

	if (errors > 0) {
		console.error(`[XP] Falha ao salvar ${errors} usuários.`);
	}
}

function getCachedXP(userId, guildId) {
	if (!userId || typeof userId !== 'string') {
		return null;
	}

	const user = users.get(userId);

	if (!user || !user.loaded) {
		return null;
	}

	const guild = user.guilds.get(guildId);

	if (!guild) {
		return null;
	}

	return {
		globalXP: Math.max(0, user.globalXP),
		xp: Math.max(0, guild.xp),
		level: getLevel(guild.xp),
		globalLevel: getLevel(user.globalXP)
	};
}

module.exports = {
	handleMessage,
	handleVoiceStateUpdate,
	startVoiceXP,
	saveAll,
	getCachedXP,
	getLevel,
	XP_PER_LEVEL
};