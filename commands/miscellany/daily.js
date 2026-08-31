const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getMembersCollection } = require('../../services/firebase');
const { getCachedXP, XP_PER_LEVEL } = require('../../services/xp');
const colors = require('../../services/colors');

const BASE_CREDITS = 1000;
const BOOSTER_BONUS = 1000;
const LEVEL_BONUS = 500;
const XP_BONUS_PER_1000 = 25;

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;

function formatCurrency(value) {
	return Math.trunc(value).toLocaleString('pt-BR');
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('daily')
		.setDescription('Resgate seus créditos diários.'),

	async execute(interaction) {
		if (!interaction.guild) {
			return interaction.reply({
				content: 'Esse comando só funciona em um servidor.',
				flags: MessageFlags.Ephemeral
			});
		}

		await interaction.deferReply();

		try {
			const userId = interaction.user.id;
			const guildId = interaction.guild.id;
			const mainGuildId = process.env.DISCORD_GUILD_ID;

			const member = await interaction.guild.members
				.fetch(userId)
				.catch(() => null);

			if (!member) {
				return interaction.editReply(
					'Ops, não consegui te identificar no servidor.'
				);
			}

			const members = getMembersCollection();
			const userRef = members.doc(userId);

			const snapshot = await userRef.get();
			const data = snapshot.exists ? snapshot.data() : {};

			const now = Date.now();

			const lastClaimed =
				typeof data.daily?.lastClaimed === 'number'
					? data.daily.lastClaimed
					: 0;

			if (lastClaimed > 0) {
				const remaining = lastClaimed + DAILY_COOLDOWN - now;

				if (remaining > 0) {
					return interaction.editReply(
						'Você já resgatou seu daily. Volte amanhã!'
					);
				}
			}

			let totalCredits = BASE_CREDITS;

			const isMainGuild =
				mainGuildId &&
				guildId === mainGuildId;

			let serverXP = 0;
			let serverLevel = 0;

			if (isMainGuild) {
				const cachedXP = getCachedXP(userId, mainGuildId);

				if (cachedXP) {
					serverXP = cachedXP.xp;
				} else {
					serverXP =
						typeof data.servers?.[mainGuildId]?.xp === 'number'
							? data.servers[mainGuildId].xp
							: 0;
				}

				serverLevel = Math.floor(
					serverXP / XP_PER_LEVEL
				);

				const levelBonus =
					serverLevel * LEVEL_BONUS;

				const xpBonus =
					Math.floor(serverXP / 1000) *
					XP_BONUS_PER_1000;

				const isBooster = member.roles.cache.some(
					role => role.name === 'Server Booster'
				);

				if (isBooster) {
					totalCredits += BOOSTER_BONUS;
				}

				totalCredits += levelBonus;
				totalCredits += xpBonus;
			}

			const currentCredits =
				typeof data.credits === 'number'
					? data.credits
					: 0;

			await userRef.set(
				{
					credits: currentCredits + totalCredits,
					daily: {
						lastClaimed: now
					}
				},
				{ merge: true }
			);

			const colorNames = new Set(
				colors.map(color => color.name.toLowerCase())
			);

			const colorRole = member.roles.cache.find(role =>
				colorNames.has(role.name.toLowerCase())
			);

			const embedColor = colorRole?.color || 0x2B2D31;

			const embed = new EmbedBuilder()
				.setTitle(member.displayName)
				.setDescription(
					`Você resgatou **C$ ${formatCurrency(totalCredits)} créditos!**`
				)
				.setColor(embedColor)
				.setThumbnail(
					member.displayAvatarURL({
						size: 1024
					})
				)
				.setFooter({
					text: `SNUF OPERATING SYSTEMS | ID: ${member.id}`
				})
				.setTimestamp();

			embed.addFields({
				name: 'Base',
				value: `C$ ${formatCurrency(BASE_CREDITS)}`,
				inline: true
			});

			if (isMainGuild) {
				const isBooster = member.roles.cache.some(
					role => role.name === 'Server Booster'
				);

				const levelBonus =
					serverLevel * LEVEL_BONUS;

				const xpBonus =
					Math.floor(serverXP / 1000) *
					XP_BONUS_PER_1000;

				if (isBooster) {
					embed.addFields({
						name: 'Booster',
						value: `C$ ${formatCurrency(BOOSTER_BONUS)}`,
						inline: true
					});
				}

				if (levelBonus > 0) {
					embed.addFields({
						name: `Bônus de Level (${serverLevel})`,
						value: `C$ ${formatCurrency(levelBonus)}`,
						inline: true
					});
				}

				if (xpBonus > 0) {
					embed.addFields({
						name: `Bônus de XP (${formatCurrency(serverXP)} XP)`,
						value: `C$ ${formatCurrency(xpBonus)}`,
						inline: true
					});
				}
			}

			await interaction.editReply({
				embeds: [embed]
			});

		} catch (error) {
			console.error('Erro ao executar /daily:', error);

			if (interaction.deferred) {
				await interaction.editReply(
					'Não consegui processar seu daily agora.'
				);
			}
		}
	}
};