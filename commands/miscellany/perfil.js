const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMembersCollection } = require('../../services/firebase');
const { getCachedXP, XP_PER_LEVEL } = require('../../services/xp');
const colors = require('../../services/colors');

function formatCurrency(value) {
	return Math.trunc(value).toLocaleString('pt-BR');
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('perfil')
		.setDescription('Mostra o seu perfil, ou o perfil de outra pessoa.')
		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('Pessoa para ver o perfil.')
				.setRequired(false)
		),

	async execute(interaction) {
		if (!interaction.guild) {
			return interaction.reply({
				content: 'Esse comando só funciona em um servidor.',
				ephemeral: true
			});
		}

		await interaction.deferReply();

		try {
			const target =
				interaction.options.getUser('user') ||
				interaction.user;

			const member = await interaction.guild.members
				.fetch(target.id)
				.catch(() => null);

			if (!member) {
				return interaction.editReply(
					'Membro não encontrado...'
				);
			}

			const members = getMembersCollection();
			const userRef = members.doc(target.id);
			const userSnapshot = await userRef.get();

			let credits = 0;
			let globalXP = 0;
			let xp = 0;

			if (userSnapshot.exists) {
				const data = userSnapshot.data();

				credits =
					typeof data.credits === 'number'
						? data.credits
						: 0;

				globalXP =
					typeof data.xpGlobal === 'number'
						? data.xpGlobal
						: 0;

				const serverData =
					data.servers?.[interaction.guild.id] || {};

				xp =
					typeof serverData.xp === 'number'
						? serverData.xp
						: 0;
			}

			const cachedXP = getCachedXP(
				target.id,
				interaction.guild.id
			);

			if (cachedXP) {
				globalXP = cachedXP.globalXP;
				xp = cachedXP.xp;
			}

			const level = Math.floor(xp / XP_PER_LEVEL);

			const colorNames = new Set(
				colors.map(color => color.name.toLowerCase())
			);

			const colorRole = member.roles.cache.find(role =>
				colorNames.has(role.name.toLowerCase())
			);

			const embedColor = colorRole?.color || 0x2B2D31;

			const roles = member.roles.cache
				.filter(role => role.id !== interaction.guild.id)
				.sort((a, b) => b.position - a.position);

			const highestRole =
				roles.first()?.name || 'Sem cargo';

			const joinedDate = member.joinedAt
				? member.joinedAt.toLocaleDateString('pt-BR')
				: 'Desconhecido';

			const embed = new EmbedBuilder()
				.setTitle(member.displayName)
				.setColor(embedColor)
				.setThumbnail(
					member.displayAvatarURL({
						size: 1024
					})
				)
				.addFields(
					{
						name: 'Créditos',
						value: `C$ ${formatCurrency(credits)}`,
						inline: false
					},
					{
						name: 'Cargo',
						value: highestRole,
						inline: true
					},
					{
						name: 'XP & Nível',
						value: `XP: ${formatCurrency(xp)} | Nível: ${level}`,
						inline: true
					},
					{
						name: 'XP Global',
						value: formatCurrency(globalXP),
						inline: true
					},
					{
						name: 'Entrou aqui',
						value: joinedDate,
						inline: true
					}
				)
				.setFooter({
					text: `SNUF OPERATING SYSTEMS | ID: ${member.id}`
				})
				.setTimestamp();

			await interaction.editReply({
				embeds: [embed]
			});

		} catch (error) {
			console.error('Erro ao executar /perfil:', error);

			await interaction.editReply(
				'Não consegui carregar esse perfil agora.'
			);
		}
	}
};