const { spawn } = require('node:child_process');

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

const RADIO_STREAM =
	'https://streaming.radio.co/s8f5d0b7a8/listen';

let connection = null;
let player = null;
let ffmpeg = null;
let started = false;
let restarting = false;

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

		console.log('[RADIO] Conectando');

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
				stopFFmpeg();
				started = false;
			}
		);

		player.on(AudioPlayerStatus.Idle, () => {
			if (!started || restarting) {
				return;
			}

			restartRadio(channel);
		});

		player.on('error', error => {
			console.error(
				'[RADIO] Player:',
				error.message
			);

			if (!started || restarting) {
				return;
			}

			restartRadio(channel);
		});

		await waitForConnection();

		started = true;

		await playRadio(channel);

	} catch (error) {
		console.error(
			'[RADIO] Erro ao iniciar:',
			error.message
		);

		started = false;

		stopFFmpeg();

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
				new Error(
					'Timeout na conexão de voz.'
				)
			);
		}, 30000);

		const onReady = () => {
			cleanup();
			resolve();
		};

		const onDisconnected = () => {
			cleanup();

			reject(
				new Error(
					'Conexão perdida.'
				)
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
	if (!player || !connection || !started) {
		return;
	}

	stopFFmpeg();

	console.log('[RADIO] Iniciando stream');

	const processRef = spawn(
		'ffmpeg',
		[
			'-hide_banner',

			'-loglevel',
			'error',

			'-reconnect',
			'1',

			'-reconnect_streamed',
			'1',

			'-reconnect_delay_max',
			'5',

			'-i',
			RADIO_STREAM,

			'-vn',

			'-f',
			's16le',

			'-ar',
			'48000',

			'-ac',
			'2',

			'pipe:1'
		],
		{
			stdio: [
				'ignore',
				'pipe',
				'pipe'
			]
		}
	);

	ffmpeg = processRef;

	let receivedAudio = false;

	processRef.on('spawn', () => {
		console.log('[RADIO] FFmpeg iniciado');
	});

	processRef.stdout.on('data', data => {
		if (!receivedAudio) {
			receivedAudio = true;
			console.log('[RADIO] Áudio recebido');
		}
	});

	processRef.stderr.on('data', data => {
		const message = data
			.toString()
			.trim();

		if (message) {
			console.error(
				'[RADIO] FFmpeg:',
				message
			);
		}
	});

	processRef.on('error', error => {
		console.error(
			'[RADIO] FFmpeg:',
			error.message
		);

		if (ffmpeg === processRef) {
			ffmpeg = null;
		}
	});

	processRef.on('close', code => {
		if (ffmpeg === processRef) {
			ffmpeg = null;
		}

		if (
			code !== 0 &&
			started &&
			!restarting
		) {
			console.error(
				`[RADIO] FFmpeg encerrou com código ${code}`
			);

			setTimeout(() => {
				if (started) {
					playRadio(channel)
						.catch(() => {});
				}
			}, 10000);
		}
	});

	const resource = createAudioResource(
		processRef.stdout,
		{
			inputType: StreamType.Raw,
			inlineVolume: false
		}
	);

	player.play(resource);

	await updateVoiceStatus(
		channel,
		'Radio'
	);
}

function stopFFmpeg() {
	if (!ffmpeg) {
		return;
	}

	try {
		ffmpeg.kill('SIGKILL');
	} catch {
	}

	ffmpeg = null;
}

function restartRadio(channel) {
	if (restarting) {
		return;
	}

	restarting = true;

	stopFFmpeg();

	setTimeout(async () => {
		try {
			if (started) {
				await playRadio(channel);
			}
		} catch {
		} finally {
			restarting = false;
		}
	}, 5000);
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
		stopFFmpeg();

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
