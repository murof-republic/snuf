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
	}
];

let connection = null;
let player = null;
let stream = null;
let started = false;
let changing = false;
let currentRadio = null;

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

		console.log('[RADIO] Conectada!');

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

async function skipSong() {
	if (!player || !started || changing) {
		return false;
	}

	player.stop();

	return true;
}

module.exports = {
	startRadio,
	skipSong
};
