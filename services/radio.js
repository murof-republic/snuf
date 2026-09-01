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

async function startRadio(client) {
	if (started) return;

	if (!GUILD_ID || !CHANNEL_ID) {
		console.error(
			'[RADIO] DISCORD_GUILD_ID ou RADIO_CHANNEL_ID não configurado.'
		);
		return;
	}

	try {
		const guild = await client.guilds
			.fetch(GUILD_ID)
			.catch(() => null);

		if (!guild) {
			console.error('[RADIO] Servidor não encontrado.');
			return;
		}

		const channel = await guild.channels
			.fetch(CHANNEL_ID)
			.catch(() => null);

		if (!channel || !channel.isVoiceBased()) {
			console.error('[RADIO] Canal de voz não encontrado.');
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
				console.error('[RADIO] Discord desconectou.');
				stopFFmpeg();
				started = false;
			}
		);

		player.on(
			AudioPlayerStatus.Playing,
			() => {
				console.log('[RADIO] Player está tocando.');
			}
		);

		player.on(
			AudioPlayerStatus.Idle,
			() => {
				console.log('[RADIO] Player ficou parado.');
			}
		);

		player.on('error', error => {
			console.error(
				'[RADIO] Erro do player:',
				error
			);
		});

		await waitForConnection();

		started = true;

		await playRadio(channel);

	} catch (error) {
		console.error(
			'[RADIO] Erro ao iniciar:',
			error
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
			'-hide_banner',

			'-loglevel',
			'verbose',

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

	const processRef = ffmpeg;

	let receivedAudio = false;

	processRef.on('spawn', () => {
		console.log('[RADIO] FFmpeg iniciado.');
	});

	processRef.stdout.on('data', data => {
		if (!receivedAudio) {
			receivedAudio = true;

			console.log(
				`[RADIO] Áudio recebido (${data.length} bytes).`
			);
		}
	});

	processRef.stderr.on('data', data => {
		const message = data
			.toString()
			.trim();

		if (message) {
			console.error(
				`[RADIO] FFmpeg: ${message}`
			);
		}
	});

	processRef.on('error', error => {
		console.error(
			'[RADIO] Erro ao executar FFmpeg:',
			error
		);

		if (ffmpeg === processRef) {
			ffmpeg = null;
		}
	});

	processRef.on('close', (code, signal) => {
		console.error(
			`[RADIO] FFmpeg encerrou. Código: ${code} | Sinal: ${signal} | Áudio recebido: ${receivedAudio}`
		);

		if (ffmpeg === processRef) {
			ffmpeg = null;
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
