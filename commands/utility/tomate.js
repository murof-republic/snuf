const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tomate')
		.setDescription('Atira um tomate a alguém.')
		.addUserOption(opt =>
			opt
				.setName('alvo')
				.setDescription('Quem vai levar o tomate.')
				.setRequired(true)
		),

	async execute(interaction) {
		const alvo = interaction.options.getUser('alvo');

		if (alvo.id === interaction.client.user.id) {
			return interaction.reply(
				`${alvo} jogou um 🍅 de volta em ${interaction.user}!\n` +
				`Tá maluco? Não mexe comigo !`
			);
		}

		await interaction.reply(
			`${interaction.user} atirou um 🍅 em ${alvo}!`
		);
	},
};