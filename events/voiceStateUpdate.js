const { Events } = require('discord.js');
const { handleVoiceStateUpdate } = require('../services/xp');
const radio = require('../services/radio');

module.exports = {
	name: Events.VoiceStateUpdate,

	async execute(oldState, newState) {
		try {
			await handleVoiceStateUpdate(oldState, newState);
			await radio.handleVoiceStateUpdate(newState.client, oldState, newState);
		} catch (error) {
			console.error('[EVENT] Erro em voiceStateUpdate:', error.message);
		}
	}
};