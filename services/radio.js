const https = require('node:https');

const {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus,
	VoiceConnectionStatus,
	StreamType
} = require('@discordjs/voice');

const DEFAULT_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DEFAULT_CHANNEL_ID = process.env.RADIO_CHANNEL_ID;

const radios = [
	{ name: 'R2 Chill', aliases: ['r2 chill', 'chill'], url: 'https://icecast.err.ee/r2chill.opus' },
	{ name: 'R2 Pop', aliases: ['r2 pop', 'pop'], url: 'https://icecast.err.ee/r2pop.opus' },
	{ name: 'R2 Rock', aliases: ['r2 rock', 'rock'], url: 'https://icecast.err.ee/r2rock.opus' },
	{ name: 'R2 Alternatiiv', aliases: ['r2 alternatiiv', 'alternatiiv'], url: 'https://icecast.err.ee/r2alternatiiv.opus' },
	{ name: 'R2p', aliases: ['r2p', 'r2 p'], url: 'https://icecast.err.ee/r2p.opus' },
	{ name: 'R2 Music', aliases: ['r2 music', 'music'], url: 'https://icecast.err.ee/r2music.opus' },
	{ name: 'Klara Jazz', aliases: ['klara jazz', 'jazz'], url: 'https://icecast.err.ee/klarajazz.opus' },
	{ name: 'Klara Klassika', aliases: ['klara klassika', 'klassika'], url: 'https://icecast.err.ee/klaraklassika.opus' },
	{ name: 'Raadio Tallinn', aliases: ['raadio tallinn', 'tallinn'], url: 'https://icecast.err.ee/raadiotallinn.opus' },
	{ name: 'Klara Nostalgia', aliases: ['klara nostalgia', 'nostalgia'], url: 'https://icecast.err.ee/klaranostalgia.opus' },
	{ name: 'Klassikaraadio', aliases: ['klassikaraadio', 'klassika radio'], url: 'https://icecast.err.ee/klassikaraadio.opus' },
	{ name: 'Vikerraadio', aliases: ['vikerraadio', 'viker'], url: 'https://icecast.err.ee/vikerraadio.opus' }
];

const radioStates = new Map();

function getOrCreateState(guildId) {
	if (!guildId) {
		return null;
	}

	if (!radioStates.has(guildId)) {
		radioStates.set(guildId, {
			connection: null,
			player: null,
			stream: null,
			started: false,
			changing: false,
			currentRadio: null,
			currentChannel: null
		});
	}

	return radioStates.get(guildId);
}

function stopStream(state) {
	if (!state?.stream) {
		return;
	}

	try {
		state.stream.destroy();
	} catch {
	}

	state.stream = null;
}

function normalizeRadioName(value) {
	return String(value || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

async function waitForConnection(connection) {
	if (!connection) {
		throw new Error('Conexão não existe.');
	}

	if (connection.state.status === VoiceConnectionStatus.Ready) {
		return;
	}

	await new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('Timeout ao conectar a rádio.'));
		}, 30000);

		const onReady = () => {
			cleanup();
			resolve();
		};

		const onDisconnected = () => {
			cleanup();
			reject(new Error('Desconectado da rádio.'));
		};

		function cleanup() {
			clearTimeout(timeout);
			connection.off(VoiceConnectionStatus.Ready, onReady);
			connection.off(VoiceConnectionStatus.Disconnected, onDisconnected);
		}

		connection.once(VoiceConnectionStatus.Ready, onReady);
		connection.once(VoiceConnectionStatus.Disconnected, onDisconnected);
	});
}

async function playRadio(guildId, channel, radio) {
	const state = getOrCreateState(guildId);

	if (!state || !state.player || !state.connection || !radio) {
		return false;
	}

	return new Promise((resolve, reject) => {
		const request = https.get(radio.url, response => {
			if (response.statusCode !== 200) {
				response.resume();
				reject(new Error(`HTTP ${response.statusCode}`));
				return;
			}

			state.stream = response;
			const resource = createAudioResource(response, { inputType: StreamType.OggOpus });
			state.player.play(resource);
			updateVoiceStatus(channel, radio.name).catch(() => {});
			resolve(true);
		});

		request.setTimeout(15000, () => {
			request.destroy();
		});

		request.on('error', reject);
	});
}

async function playNextRadio(guildId, channel) {
	const state = getOrCreateState(guildId);

	if (!state || !state.player || !state.connection || !state.started || state.changing) {
		return false;
	}

	state.changing = true;

	try {
		stopStream(state);

		const availableRadios = radios.filter(radio => radio !== state.currentRadio);
		const radio = availableRadios[Math.floor(Math.random() * availableRadios.length)];

		if (!radio) {
			return false;
		}

		const success = await playRadio(guildId, channel, radio);
		if (success) {
			state.currentRadio = radio;
			return true;
		}

		return false;
	} catch {
		return false;
	} finally {
		state.changing = false;
	}
}

async function updateVoiceStatus(channel, status) {
	if (!channel?.client?.rest) {
		return;
	}

	try {
		await channel.client.rest.put(`/channels/${channel.id}/voice-status`, {
			body: { status }
		});
	} catch {
	}
}

async function startRadio(client, guildId = DEFAULT_GUILD_ID, channelId = DEFAULT_CHANNEL_ID) {
	if (!client || !guildId || !channelId) {
		return false;
	}

	const state = getOrCreateState(guildId);
	if (!state) {
		return false;
	}

	if (state.started) {
		return true;
	}

	try {
		const guild = await client.guilds.fetch(guildId).catch(() => null);
		if (!guild) {
			return false;
		}

		const channel = await guild.channels.fetch(channelId).catch(() => null);
		if (!channel || !channel.isVoiceBased()) {
			return false;
		}

		state.currentChannel = channel;
		state.connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: guild.id,
			adapterCreator: guild.voiceAdapterCreator,
			selfDeaf: true,
			selfMute: false
		});
		state.player = createAudioPlayer();
		state.connection.subscribe(state.player);

		state.connection.on(VoiceConnectionStatus.Disconnected, () => {
			stopStream(state);
			state.started = false;
		});

		state.player.on(AudioPlayerStatus.Idle, () => {
			if (state.started && !state.changing) {
				playNextRadio(guildId, channel).catch(() => {});
			}
		});

		state.player.on('error', () => {
			if (state.started && !state.changing) {
				playNextRadio(guildId, channel).catch(() => {});
			}
		});

		await waitForConnection(state.connection);
		state.started = true;
		await playNextRadio(guildId, channel);
		return true;
	} catch {
		stopRadio(guildId);
		return false;
	}
}

async function setRadio(radioName, guildId = DEFAULT_GUILD_ID, userChannelId = null) {
	const state = getOrCreateState(guildId);
	if (!state || !state.player || !state.connection || !state.started || !state.currentChannel) {
		return false;
	}

	if (userChannelId && state.currentChannel.id !== userChannelId) {
		return false;
	}

	if (state.changing) {
		return false;
	}

	const normalizedInput = normalizeRadioName(radioName);
	const radio = radios.find(station => {
		const names = [station.name, ...(station.aliases || [])];
		return names.some(name => normalizeRadioName(name) === normalizedInput);
	});

	if (!radio || state.currentRadio === radio) {
		return !!state.currentRadio === radio;
	}

	state.changing = true;

	try {
		stopStream(state);
		const success = await playRadio(guildId, state.currentChannel, radio);
		if (!success) {
			return false;
		}
		state.currentRadio = radio;
		return true;
	} catch {
		return false;
	} finally {
		state.changing = false;
	}
}

async function skipSong(guildId = DEFAULT_GUILD_ID, userChannelId = null) {
	const state = getOrCreateState(guildId);
	if (!state || !state.player || !state.started || state.changing) {
		return false;
	}

	if (userChannelId && state.currentChannel && state.currentChannel.id !== userChannelId) {
		return false;
	}

	state.player.stop();
	return true;
}

function getCurrentChannelId(guildId = DEFAULT_GUILD_ID) {
	const state = getOrCreateState(guildId);
	return state?.currentChannel?.id ?? null;
}

function getRadios() {
	return radios;
}

function stopRadio(guildId = DEFAULT_GUILD_ID) {
	const state = getOrCreateState(guildId);
	if (!state) {
		return false;
	}

	state.started = false;
	state.changing = false;
	stopStream(state);

	if (state.player) {
		state.player.stop();
		state.player = null;
	}

	if (state.connection) {
		state.connection.destroy();
		state.connection = null;
	}

	state.currentRadio = null;
	state.currentChannel = null;

	return true;
}

module.exports = {
	startRadio,
	skipSong,
	setRadio,
	getCurrentChannelId,
	getRadios,
	stopRadio
};
