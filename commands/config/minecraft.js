const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	MessageFlags
} = require('discord.js');

const { getGuildsCollection } = require('../../services/database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('minecraft')
		.setDescription('Configura o dashboard do servidor de Minecraft.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addChannelOption(option =>
			option
				.setName('canal')
				.setDescription('Canal onde o dashboard será enviado.')
				.setRequired(true)
		),

	async execute(interaction) {
		const channel = interaction.options.getChannel('canal', true);

		try {
			const guilds = getGuildsCollection();

			await guilds.doc(interaction.guild.id).set({
				minecraft: {
					channelId: channel.id
				}
			}, { merge: true });

			await interaction.reply({
				content: `O dashboard do Minecraft será enviado em ${channel}.`,
				flags: MessageFlags.Ephemeral
			});
		} catch (error) {
			console.error('Erro ao configurar o dashboard do Minecraft:', error);

			await interaction.reply({
				content: 'Não consegui salvar a configuração do dashboard.',
				flags: MessageFlags.Ephemeral
			});
		}
	}
};