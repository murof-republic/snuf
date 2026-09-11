const guilds = require('./guilds');

const WINDOW_MS = 5_000;
const MAX_MESSAGES = 5;
const DUPLICATE_WINDOW_MS = 10_000;
const MAX_DUPLICATES = 3;
const TIMEOUT_MS = 5 * 60 * 1_000;
const CONFIG_CACHE_MS = 30_000;

const messageHistory = new Map();
const configCache = new Map();

function isEnabled(guildId) {
	const cached = configCache.get(guildId);

	if (cached && cached.expiresAt > Date.now()) {
		return cached.enabled;
	}

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
	return message.content.trim().toLowerCase().replace(/\s+/g, ' ');
}

function registerMessage(message) {
	const now = Date.now();
	const key = `${message.guild.id}:${message.author.id}`;
	const history = (messageHistory.get(key) ?? []).filter(
		entry => now - entry.timestamp <= DUPLICATE_WINDOW_MS
	);

	history.push({
		timestamp: now,
		content: normalizeContent(message),
	});
	messageHistory.set(key, history);

	const recentMessages = history.filter(
		entry => now - entry.timestamp <= WINDOW_MS
	);
	const duplicateMessages = history.filter(
		entry => entry.content === normalizeContent(message)
	);

	return recentMessages.length > MAX_MESSAGES || duplicateMessages.length >= MAX_DUPLICATES;
}

function clearUserHistory(message) {
	messageHistory.delete(`${message.guild.id}:${message.author.id}`);
}

async function handleMessage(message) {
	if (!message.guild || message.author.bot || !message.member) return false;

	let enabled;

	try {
		enabled = await getEnabled(message.guild.id);
	} catch (error) {
		console.error('[ANTI-SPAM] Não foi possível carregar a configuração:', error.message);
		return false;
	}

	if (!enabled) return false;

	if (
		message.member.permissions.has('Administrator') ||
		message.member.permissions.has('ModerateMembers')
	) {
		return false;
	}

	if (!registerMessage(message)) return false;

	clearUserHistory(message);

	try {
		await message.delete();
	} catch (error) {
		console.error('[ANTI-SPAM] Não foi possível apagar a mensagem:', error.message);
	}

	if (message.member.moderatable) {
		try {
			await message.member.timeout(TIMEOUT_MS, 'Spam ou flood detectado');
		} catch (error) {
			console.error('[ANTI-SPAM] Não foi possível aplicar timeout:', error.message);
		}
	}

	return true;
}

function invalidateConfig(guildId) {
	configCache.delete(guildId);
}

module.exports = {
	handleMessage,
	invalidateConfig,
};