const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const radio = require('../../services/radio');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pular')
		.setDescription('Pula a estação da rádio.'),

	async execute(interaction) {
		const radioGuildId = process.env.DISCORD_GUILD_ID;

		if (interaction.guildId !== radioGuildId) {
			return interaction.reply({
				content: 'Esse comando só pode ser usado no servidor da rádio.',
				flags: MessageFlags.Ephemeral
			});
		}

		const skipped = await radio.skipSong();

		if (!skipped) {
			return interaction.reply({
				content: 'A rádio não está tocando no momento.',
				flags: MessageFlags.Ephemeral
			});
		}

		return interaction.reply({
			content: 'Estação pulada!',
			flags: MessageFlags.Ephemeral
		});
	}
};
