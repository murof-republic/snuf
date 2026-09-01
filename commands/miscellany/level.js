const { SlashCommandBuilder } = require('discord.js');
const { getMembersCollection } = require('../../services/firebase');
const { getCachedXP, XP_PER_LEVEL } = require('../../services/xp');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('level')
		.setDescription('Mostra seu level no servidor.')
		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('Pessoa para ver o level.')
				.setRequired(false)
		),

	async execute(interaction) {
		if (!interaction.guild) {
			return interaction.reply({
				content: 'Esse comando só funciona em um servidor.',
				ephemeral: true
			});
		}

		try {
			const target =
				interaction.options.getUser('user') ||
				interaction.user;

			const userId = target.id;
			const guildId = interaction.guild.id;

			let serverXP = 0;

			const cachedXP = getCachedXP(userId, guildId);

			if (cachedXP) {
				serverXP = cachedXP.xp;
			} else {
				const members = getMembersCollection();
				const snapshot = await members.doc(userId).get();

				if (snapshot.exists) {
					const data = snapshot.data();

					serverXP =
						typeof data.servers?.[guildId]?.xp === 'number'
							? data.servers[guildId].xp
							: 0;
				}
			}

			const serverLevel = Math.floor(
				serverXP / XP_PER_LEVEL
			);

			return interaction.reply({
				content: `${target} está no level ${serverLevel} (${serverXP.toLocaleString('pt-BR')} XP) neste servidor.`
			});

		} catch (error) {
			console.error('Erro ao executar /level:', error);

			return interaction.reply({
				content: 'Não consegui carregar o level agora.',
				ephemeral: true
			});
		}
	}
};