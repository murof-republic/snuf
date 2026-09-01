const {
	SlashCommandBuilder,
	MessageFlags
} = require('discord.js');

const radio = require('../../services/radio');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('estação')
		.setDescription('Escolhe uma estação específica da rádio.')
		.addStringOption(option =>
			option
				.setName('estacao')
				.setDescription('Escolha a estação.')
				.setRequired(true)
				.addChoices(
					...radio.getRadios().map(station => ({
						name: station.name,
						value: station.name
					}))
				)
		),

	async execute(interaction) {
		if (
			interaction.guildId !==
			process.env.DISCORD_GUILD_ID
		) {
			return interaction.reply({
				content:
					'Esse comando só pode ser usado no servidor da rádio.',
				flags: MessageFlags.Ephemeral
			});
		}

		const station =
			interaction.options.getString(
				'estacao',
				true
			);

		const success =
			await radio.setRadio(station);

		if (!success) {
			return interaction.reply({
				content:
					'Não consegui mudar para essa estação.',
				flags: MessageFlags.Ephemeral
			});
		}

		return interaction.reply({
			content: `Estação alterada para **${station}**!`,
			flags: MessageFlags.Ephemeral
		});
	}
};
