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

const RADIO_STREAM = 'http://stream-tx1.radioparadise.com/mp3-128';

let connection = null;
let player = null;
let resource = null;
let started = false;

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

		console.log('[RADIO] Conectada!');

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
				started = false;
			}
		);

		player.on(AudioPlayerStatus.Idle, () => {
			if (!started) return;

			playRadio(channel).catch(() => {});
		});

		player.on('error', () => {
			setTimeout(() => {
				if (started) {
					playRadio(channel).catch(() => {});
				}
			}, 3000);
		});

		await waitForConnection();

		started = true;

		await playRadio(channel);

	} catch {
		started = false;

		if (connection) {
			connection.destroy();
			connection = null;
		}
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
			reject(
				new Error('Timeout na conexão de voz.')
			);
		}, 30000);

		const onReady = () => {
			cleanup();
			resolve();
		};

		const onDisconnected = () => {
			cleanup();
			reject(
				new Error('Conexão perdida.')
			);
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

async function playRadio(channel) {
	if (!player || !connection) {
		return;
	}

	try {
		resource = createAudioResource(
			RADIO_STREAM,
			{
				inputType: StreamType.Raw,
				inlineVolume: false
			}
		);

		player.play(resource);

		await updateVoiceStatus(
			channel,
			'Radio Paradise'
		);

	} catch {
		setTimeout(() => {
			if (started) {
				playRadio(channel).catch(() => {});
			}
		}, 5000);
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
	if (!player) {
		return false;
	}

	try {
		player.stop();

		return true;
	} catch {
		return false;
	}
}

module.exports = {
	startRadio,
	skipSong
};