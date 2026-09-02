const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('avatar')
		.setDescription('Visualizar seu avatar, ou de outra pessoa.')
		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('User para mostrar o avatar')
				.setRequired(false)
		),

	async execute(interaction) {
		const target = interaction.options.getUser('user') || interaction.user;
		const member = await interaction.guild.members.fetch(target.id);

		const avatarUrl = member.displayAvatarURL({
			size: 1024,
			extension: 'png'
		});

		const memberName = member.displayName;

		const embed = new EmbedBuilder()
			.setTitle(`Avatar de ${memberName}`)
			.setDescription(`[Abrir avatar](${avatarUrl})`)
			.setColor(0x5865f2)
			.setImage(avatarUrl);

		await interaction.reply({ embeds: [embed] });
	}
};