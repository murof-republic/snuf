const https = require('node:https');

const {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus,
	VoiceConnectionStatus,
	StreamType
} = require('@discordjs/voice');

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CHANNEL_ID = process.env.RADIO_CHANNEL_ID;

const radios = [
	{
		name: 'Lofi Hip Hop',
		url: 'https://stream.openmusic.fm/lofi'
	},
	{
		name: 'Chill Beats',
		url: 'https://stream.openmusic.fm/chill'
	},
	{
		name: 'Deep House',
		url: 'https://stream.openmusic.fm/deephouse'
	},
	{
		name: 'Synthwave',
		url: 'https://stream.openmusic.fm/synthwave'
	},
	{
		name: 'Lo-Fi Beats',
		url: 'https://stream.openmusic.fm/lofibeats'
	},
	{
		name: 'Jazz',
		url: 'https://stream.openmusic.fm/jazz'
	},
	{
		name: 'Classical',
		url: 'https://stream.openmusic.fm/classical'
	},
	{
		name: 'Piano',
		url: 'https://stream.openmusic.fm/piano'
	},
	{
		name: 'Ambient',
		url: 'https://stream.openmusic.fm/ambient'
	},
	{
		name: 'Study Music',
		url: 'https://stream.openmusic.fm/studymusic'
	},
	{
		name: 'Chillwave',
		url: 'https://stream.openmusic.fm/chillwave'
	},
	{
		name: 'Indie',
		url: 'https://stream.openmusic.fm/indie'
	},
	{
		name: 'Electronic',
		url: 'https://stream.openmusic.fm/electronic'
	},
	{
		name: 'Vaporwave',
		url: 'https://stream.openmusic.fm/vaporwave'
	},
	{
		name: 'Cyberpunk',
		url: 'https://stream.openmusic.fm/cyberpunk'
	},

	{
		name: 'R2 Chill',
		url: 'https://icecast.err.ee/r2chill.opus'
	},
	{
		name: 'R2 Pop',
		url: 'https://icecast.err.ee/r2pop.opus'
	},
	{
		name: 'R2 Rock',
		url: 'https://icecast.err.ee/r2rock.opus'
	},
	{
		name: 'R2 Alternatiiv',
		url: 'https://icecast.err.ee/r2alternatiiv.opus'
	},
	{
		name: 'R2p',
		url: 'https://icecast.err.ee/r2p.opus'
	},
	{
		name: 'R2 Music',
		url: 'https://icecast.err.ee/r2music.opus'
	},
	{
		name: 'Klara Jazz',
		url: 'https://icecast.err.ee/klarajazz.opus'
	},
	{
		name: 'Klara Klassika',
		url: 'https://icecast.err.ee/klaraklassika.opus'
	},
	{
		name: 'Raadio Tallinn',
		url: 'https://icecast.err.ee/raadiotallinn.opus'
	},
	{
		name: 'Klara Nostalgia',
		url: 'https://icecast.err.ee/klaranostalgia.opus'
	},
	{
		name: 'Klassikaraadio',
		url: 'https://icecast.err.ee/klassikaraadio.opus'
	},
	{
		name: 'Raadio 4',
		url: 'https://icecast.err.ee/r4.opus'
	},
	{
		name: 'Vikerraadio',
		url: 'https://icecast.err.ee/vikerraadio.opus'
	},
	{
		name: 'RadioSEGA',
		url: 'https://icecast.radiosega.net/rs-opus.ogg'
	},
	{
		name: 'Dance Wave!',
		url: 'http://stream4.dancewave.online:8080/dance.opus'
	},
	{
		name: 'Dance Wave Retro!',
		url: 'http://stream4.dancewave.online:8080/retrodance.opus'
	},
	{
		name: 'Le Son Parisien',
		url: 'https://stream.lesonparisien.com/hi'
	}
];

let connection = null;
let player = null;
let stream = null;
let started = false;
let changing = false;
let currentRadio = null;
let currentChannel = null;

async function startRadio(client) {
	if (started) return;

	if (!GUILD_ID || !CHANNEL_ID) {
		return;
	}

	try {
		const guild = await client.guilds
			.fetch(GUILD_ID)
			.catch(() => null);

		if (!guild) {
			return;
		}

		const channel = await guild.channels
			.fetch(CHANNEL_ID)
			.catch(() => null);

		if (!channel || !channel.isVoiceBased()) {
			return;
		}

		currentChannel = channel;

		connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: guild.id,
			adapterCreator: guild.voiceAdapterCreator,
			selfDeaf: true,
			selfMute: false
		});

		player = createAudioPlayer();

		connection.subscribe(player);

		connection.on(
			VoiceConnectionStatus.Disconnected,
			() => {
				stopStream();
				started = false;
			}
		);

		player.on(
			AudioPlayerStatus.Idle,
			() => {
				if (started && !changing) {
					playNextRadio(channel);
				}
			}
		);

		player.on('error', () => {
			if (started && !changing) {
				playNextRadio(channel);
			}
		});

		await waitForConnection();

		started = true;

		await playNextRadio(channel);

	} catch {
		stopStream();

		if (connection) {
			connection.destroy();
			connection = null;
		}

		started = false;
	}
}

async function waitForConnection() {
	if (!connection) {
		throw new Error('Conexão não existe.');
	}

	if (
		connection.state.status ===
		VoiceConnectionStatus.Ready
	) {
		return;
	}

	await new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('Timeout'));
		}, 30000);

		const onReady = () => {
			cleanup();
			resolve();
		};

		const onDisconnected = () => {
			cleanup();
			reject(new Error('Desconectado'));
		};

		function cleanup() {
			clearTimeout(timeout);

			connection.off(
				VoiceConnectionStatus.Ready,
				onReady
			);

			connection.off(
				VoiceConnectionStatus.Disconnected,
				onDisconnected
			);
		}

		connection.once(
			VoiceConnectionStatus.Ready,
			onReady
		);

		connection.once(
			VoiceConnectionStatus.Disconnected,
			onDisconnected
		);
	});
}

async function playNextRadio(channel) {
	if (!player || !connection || !started || changing) {
		return;
	}

	changing = true;

	try {
		stopStream();

		const availableRadios = radios.filter(
			radio => radio !== currentRadio
		);

		const radio =
			availableRadios[
				Math.floor(
					Math.random() * availableRadios.length
				)
			];

		const success = await playRadio(
			channel,
			radio
		);

		if (success) {
			currentRadio = radio;
		} else {
			setTimeout(() => {
				if (started) {
					playNextRadio(channel);
				}
			}, 5000);
		}

	} catch {
		setTimeout(() => {
			if (started) {
				playNextRadio(channel);
			}
		}, 5000);
	} finally {
		changing = false;
	}
}

async function setRadio(radioName, userChannelId = null) {
	if (!player || !connection || !started || !currentChannel) {
		return false;
	}

	if (userChannelId && currentChannel.id !== userChannelId) {
		return false;
	}

	if (changing) {
		return false;
	}

	const radio = radios.find(
		radio =>
			radio.name.toLowerCase() ===
			radioName.toLowerCase()
	);

	if (!radio) {
		return false;
	}

	if (currentRadio === radio) {
		return true;
	}

	changing = true;

	try {
		stopStream();

		const success = await playRadio(
			currentChannel,
			radio
		);

		if (!success) {
			return false;
		}

		currentRadio = radio;

		return true;

	} catch {
		return false;

	} finally {
		changing = false;
	}
}

function playRadio(channel, radio) {
	return new Promise((resolve, reject) => {
		const request = https.get(
			radio.url,
			response => {
				if (response.statusCode !== 200) {
					response.resume();

					reject(
						new Error(
							`HTTP ${response.statusCode}`
						)
					);

					return;
				}

				stream = response;

				const resource =
					createAudioResource(
						response,
						{
							inputType:
								StreamType.OggOpus
						}
					);

				player.play(resource);

				updateVoiceStatus(
					channel,
					radio.name
				);

				resolve(true);
			}
		);

		request.setTimeout(15000, () => {
			request.destroy();
		});

		request.on('error', reject);
	});
}

function stopStream() {
	if (stream) {
		try {
			stream.destroy();
		} catch {
		}

		stream = null;
	}
}

async function updateVoiceStatus(channel, status) {
	try {
		await channel.client.rest.put(
			`/channels/${channel.id}/voice-status`,
			{
				body: {
					status
				}
			}
		);
	} catch {
	}
}

async function skipSong(userChannelId = null) {
	if (!player || !started || changing) {
		return false;
	}

	if (userChannelId && currentChannel && currentChannel.id !== userChannelId) {
		return false;
	}

	player.stop();

	return true;
}

function getCurrentChannelId() {
	return currentChannel?.id ?? null;
}

function getRadios() {
	return radios;
}

function stopRadio() {
	if (!started) {
		return false;
	}

	try {
		started = false;
		stopStream();

		if (player) {
			player.stop();
		}

		if (connection) {
			connection.destroy();
			connection = null;
		}

		player = null;
		currentRadio = null;
		currentChannel = null;

		return true;
	} catch {
		return false;
	}
}

module.exports = {
	startRadio,
	skipSong,
	setRadio,
	getCurrentChannelId,
	getRadios,
	stopRadio
};
