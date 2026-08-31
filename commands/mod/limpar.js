const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	MessageFlags
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('limpar')
		.setDescription('Apaga mensagens do chat.')
		.addIntegerOption(option =>
			option
				.setName('quantidade')
				.setDescription('Quantidade de mensagens para apagar.')
				.setRequired(true)
				.setMinValue(1)
				.setMaxValue(100)
		)
		.setDefaultMemberPermissions(
			PermissionFlagsBits.ManageMessages
		),

	async execute(interaction) {
		const quantidade = interaction.options.getInteger(
			'quantidade',
			true
		);

		if (
			!interaction.memberPermissions.has(
				PermissionFlagsBits.ManageMessages
			)
		) {
			return interaction.reply({
				content: 'Você não tem permissão para limpar mensagens.',
				flags: MessageFlags.Ephemeral
			});
		}

		try {
			const mensagens = await interaction.channel.bulkDelete(
				quantidade,
				true
			);

			await interaction.reply({
				content: `Apaguei **${mensagens.size} mensagens**.`,
				flags: MessageFlags.Ephemeral
			});

		} catch (error) {
			console.error('Erro ao limpar mensagens:', error);

			if (!interaction.replied) {
				await interaction.reply({
					content: 'Não consegui apagar as mensagens. Verifique minhas permissões.',
					flags: MessageFlags.Ephemeral
				});
			}
		}
	}
};