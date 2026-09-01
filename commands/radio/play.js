const { SlashCommandBuilder } = require('discord.js');
const { requireGuild, replyEphemeral } = require('../../utils/commandUtils');
const radio = require('../../services/radio');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Inicia a rádio no servidor.'),

	async execute(interaction) {
		if (!requireGuild(interaction, process.env.DISCORD_GUILD_ID, 'Esse comando só pode ser usado no servidor principal.')) return;

		await interaction.deferReply({ ephemeral: true });

		try {
			await radio.startRadio(interaction.client, interaction.guildId, process.env.RADIO_CHANNEL_ID);
			return interaction.editReply('Rádio iniciada com sucesso!');
		} catch (error) {
			console.error('[RADIO] Erro ao iniciar:', error);
			return interaction.editReply('Erro ao iniciar a rádio.');
		}
	}
};
