const { SlashCommandBuilder } = require('discord.js');
const { requireGuild, replyEphemeral } = require('../../utils/commandUtils');
const radio = require('../../services/radio');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('parar')
		.setDescription('Para a rádio do servidor.'),

	async execute(interaction) {
		if (!requireGuild(interaction, process.env.DISCORD_GUILD_ID, 'Esse comando só pode ser usado no servidor principal.')) return;

		const success = radio.stopRadio(interaction.guildId);

		if (!success) {
			return replyEphemeral(interaction, 'A rádio não está ativa.');
		}

		return replyEphemeral(interaction, 'Rádio parada com sucesso!');
	}
};
