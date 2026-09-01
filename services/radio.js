onst { spawn } = require('node:child_process');

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
	'http://stream-tx1.radioparadise.com/mp3-128';

let connection = null;
let player = null;
let ffmpeg = null;
let started = false;
let changingStream = false;

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
			if (!started || changingStream) return;

			reconnectStream(channel);
		});

		player.on('error', error => {
			console.error('[RADIO] Player:', error.message);

			if (!started || changingStream) return;

			reconnectStream(channel);
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

	ffmpeg = spawn(
		'ffmpeg',
		[
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

			'-loglevel',
			'error',

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

	const processRef = ffmpeg;

	ffmpeg.on('spawn', () => {
		console.log('[RADIO] FFmpeg iniciado');
	});

	let totalBytes = 0;

	ffmpeg.stdout.on('data', data => {
		totalBytes += data.length;

		console.log(
			`[RADIO] Áudio recebido: ${data.length} bytes`
		);
	});

	ffmpeg.stderr.on('data', data => {
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

	ffmpeg.on('error', error => {
		console.error(
			'[RADIO] Erro no FFmpeg:',
			error.message
		);

		if (ffmpeg === processRef) {
			ffmpeg = null;
		}
	});

	ffmpeg.on('close', code => {
		console.log(
			`[RADIO] FFmpeg encerrou. Código: ${code}. Bytes recebidos: ${totalBytes}`
		);

		if (ffmpeg === processRef) {
			ffmpeg = null;
		}

		if (
			started &&
			!changingStream
		) {
			setTimeout(() => {
				if (started) {
					playRadio(channel)
						.catch(() => {});
				}
			}, 5000);
		}
	});

	const resource = createAudioResource(
		ffmpeg.stdout,
		{
			inputType: StreamType.Raw,
			inlineVolume: false
		}
	);

	player.play(resource);

	console.log('[RADIO] Player iniciou');

	await updateVoiceStatus(
		channel,
		'Radio Paradise'
	);
}

function stopFFmpeg() {
	if (ffmpeg) {
		try {
			ffmpeg.kill('SIGKILL');
		} catch {
		}

		ffmpeg = null;
	}
}

function reconnectStream(channel) {
	if (changingStream) return;

	changingStream = true;

	stopFFmpeg();

	setTimeout(async () => {
		try {
			if (started) {
				await playRadio(channel);
			}
		} catch {
		} finally {
			changingStream = false;
		}
	}, 3000);
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
