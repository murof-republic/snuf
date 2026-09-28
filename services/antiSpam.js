const guilds = require('./guilds');

const WINDOW_MS = 5_000;
const MAX_MESSAGES = 5;
const DUPLICATE_WINDOW_MS = 10_000;
const MAX_DUPLICATES = 3;
const TIMEOUT_MS = 5 * 60 * 1_000;
const CONFIG_CACHE_MS = 30_000;
const CLEANUP_INTERVAL_MS = 60_000;

const messageHistory = new Map();
const configCache = new Map();

function isEnabled(guildId) {
	const cached = configCache.get(guildId);

	if (!cached) return null;

	if (cached.expiresAt > Date.now()) {
		return cached.enabled;
	}

	configCache.delete(guildId);
	return null;
}

async function getEnabled(guildId) {
	const cachedValue = isEnabled(guildId);

	if (cachedValue !== null) {
		return cachedValue;
	}

	const config = await guilds.get(guildId);
	const enabled = config?.spam?.enabled === true;

	configCache.set(guildId, {
		enabled,
		expiresAt: Date.now() + CONFIG_CACHE_MS,
	});

	return enabled;
}

function normalizeContent(message) {
	return message.content
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ');
}

function getUserKey(message) {
	return `${message.guild.id}:${message.author.id}`;
}

function registerMessage(message) {
	const now = Date.now();
	const key = getUserKey(message);
	const content = normalizeContent(message);

	const history = (messageHistory.get(key) ?? []).filter(
		entry => now - entry.timestamp <= DUPLICATE_WINDOW_MS
	);

	history.push({
		timestamp: now,
		content,
	});

	messageHistory.set(key, history);

	const recentMessages = history.filter(
		entry => now - entry.timestamp <= WINDOW_MS
	);

	const duplicateMessages = history.filter(
		entry => entry.content === content
	);

	return {
		flood: recentMessages.length > MAX_MESSAGES,
		duplicate: duplicateMessages.length >= MAX_DUPLICATES,
	};
}

function clearUserHistory(message) {
	messageHistory.delete(getUserKey(message));
}

function cleanupHistory() {
	const now = Date.now();

	for (const [key, history] of messageHistory) {
		const validHistory = history.filter(
			entry => now - entry.timestamp <= DUPLICATE_WINDOW_MS
		);

		if (validHistory.length === 0) {
			messageHistory.delete(key);
		} else {
			messageHistory.set(key, validHistory);
		}
	}
}

async function handleMessage(message) {
	if (!message.guild || !message.member) return false;

	if (message.client.user?.id === message.author.id) {
		return false;
	}

	let enabled;

	try {
		enabled = await getEnabled(message.guild.id);
	} catch (error) {
		console.error(
			'[ANTI-SPAM] Não foi possível carregar a configuração:',
			error.message
		);
		return false;
	}

	if (!enabled) return false;

	if (
		message.member.permissions.has('Administrator') ||
		message.member.permissions.has('ModerateMembers')
	) {
		return false;
	}

	const result = registerMessage(message);

	if (!result.flood && !result.duplicate) {
		return false;
	}

	clearUserHistory(message);

	const reason = result.flood
		? 'Flood detectado'
		: 'Spam de mensagens duplicadas detectado';

	try {
		await message.delete();
	} catch (error) {
		console.error(
			'[ANTI-SPAM] Não foi possível apagar a mensagem:',
			error.message
		);
	}

	if (!message.author.bot && message.member.moderatable) {
		try {
			await message.member.timeout(TIMEOUT_MS, reason);
		} catch (error) {
			console.error(
				'[ANTI-SPAM] Não foi possível aplicar timeout:',
				error.message
			);
		}
	}

	console.warn(
		`[ANTI-SPAM] ${message.author.tag} (${message.author.id}) ` +
		`detectado por ${reason} no servidor ${message.guild.name} (${message.guild.id})`
	);

	return true;
}

function invalidateConfig(guildId) {
	configCache.delete(guildId);
}

const cleanupTimer = setInterval(cleanupHistory, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

module.exports = {
	handleMessage,
	invalidateConfig,
};