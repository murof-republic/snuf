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
		const avatar = target.displayAvatarURL({
			size: 1024,
			extension: 'png'
		});

		const isGif = target.avatar && target.avatar.startsWith('a_');
		const avatarUrl = isGif
			? target.displayAvatarURL({ size: 1024, extension: 'gif' })
			: avatar;
		const format = isGif ? 'GIF' : 'PNG';

		const memberName = interaction.guild?.members.cache.get(target.id)?.displayName || target.username;

		const embed = new EmbedBuilder()
			.setTitle(`Avatar de ${memberName}`)
			.setDescription(`Formato: **${format}** • [Abrir](${avatarUrl})`)
			.setColor(0x5865f2)
			.setImage(avatarUrl);

		await interaction.reply({ embeds: [embed] });
	}
};
