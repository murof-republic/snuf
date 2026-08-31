const { Events } = require('discord.js');
const { handleVoiceStateUpdate } = require('../services/xp');

module.exports = {
	name: Events.VoiceStateUpdate,

	async execute(oldState, newState) {
		try {
			await handleVoiceStateUpdate(oldState, newState);
		} catch (error) {
			console.error('Erro ao processar XP de voz:', error);
		}
	}
};