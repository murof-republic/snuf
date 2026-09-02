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
		const member = interaction.guild?.members.cache.get(target.id);

		const isGif = member?.avatar?.startsWith('a_') || target.avatar?.startsWith('a_');

		const avatarUrl = member
			? member.displayAvatarURL({
				size: 1024,
				extension: isGif ? 'gif' : 'png'
			})
			: target.displayAvatarURL({
				size: 1024,
				extension: isGif ? 'gif' : 'png'
			});

		const format = isGif ? 'GIF' : 'PNG';
		const memberName = member?.displayName || target.username;

		const embed = new EmbedBuilder()
			.setTitle(`Avatar de ${memberName}`)
			.setDescription(`Formato: **${format}** • [Abrir](${avatarUrl})`)
			.setColor(0x5865f2)
			.setImage(avatarUrl);

		await interaction.reply({ embeds: [embed] });
	}
};
