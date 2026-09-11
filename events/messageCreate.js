const { Events } = require('discord.js');
const { handleMessage } = require('../services/xp');
const antiSpam = require('../services/antiSpam');

module.exports = {
	name: Events.MessageCreate,

	async execute(message) {
		try {
			if (await antiSpam.handleMessage(message)) return;
			await handleMessage(message);
		} catch (error) {
			console.error('[EVENT] Erro em messageCreate:', error.message);
		}
	}
};