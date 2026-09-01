const { Events, ActivityType } = require('discord.js');
const { startMinecraftDashboard } = require('../services/minecraft');
const { startVoiceXP } = require('../services/xp');
const logger = require('../utils/logger');

const PRESENCE_TEXTS = [
	'Quer trocar a cor do seu nick? Experimente /cor...',
	':(failure(: - Lil Yachty',
	'IVE OFFICIALLY LOST ViSiON!!!! - Lil Yachty',
	'Flutter is an open source framework developed and supported by Google',
	'SUPER TUESDAY! - JPEGMAFIA',
	'can i have nitrus today',
	'gritos de desespero',
	'I WANT TO LIVE MY LIFE AGAIN',
	'O Linux é uma alternativa confiável ao Windows e macOS.',
	'I LOVE YOU LIKE KANYE LOVES NITROUS',
	'Entre no nosso servidor do mine! - mc.murof.me',
	'Access now! https://www.murof.me/',
	'Access now! https://discord.gg/MWrYrytMCg'
];

const PRESENCE_UPDATE_INTERVAL = 60 * 60 * 1000;

let presenceIndex = 0;

module.exports = {
	name: Events.ClientReady,
	once: true,

	async execute(client) {
		logger.info('READY', `Conectado como ${client.user.tag}`);

		try {


			const updatePresence = () => {
				const text = PRESENCE_TEXTS[presenceIndex % PRESENCE_TEXTS.length];
				presenceIndex++;

				try {
					client.user.setPresence({
						status: 'online',
						activities: [
							{
								name: text,
								type: ActivityType.Listening
							}
						]
					});
				} catch (error) {
					logger.error('READY', 'Erro ao atualizar presence', error);
				}
			};

			updatePresence();

			setInterval(updatePresence, PRESENCE_UPDATE_INTERVAL);

			logger.info('READY', 'Status de presença atualizado');



			try {
				startMinecraftDashboard(client);
				logger.info('READY', 'Dashboard Minecraft iniciado');
			} catch (error) {
				logger.error('READY', 'Erro ao iniciar Dashboard Minecraft', error);
			}

			try {
				startVoiceXP(client);
				logger.info('READY', 'Sistema de XP iniciado');
			} catch (error) {
				logger.error('READY', 'Erro ao iniciar XP', error);
			}

		} catch (error) {
			logger.error('READY', 'Erro geral na inicialização', error);
		}
	}
};