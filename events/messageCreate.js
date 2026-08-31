const { Events } = require('discord.js');
const { handleMessage } = require('../services/xp');

module.exports = {
	name: Events.MessageCreate,

	async execute(message) {
		try {
			await handleMessage(message);
		} catch (error) {
			console.error('Erro ao processar XP da mensagem:', error);
		}
	}
};