const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMembersCollection } = require('../../services/firebase');

const CUSTO_POR_JOGADA = 100;
const SIMBOLOS = ['🍒', '🍋', '🍊', '⭐', '💎', '🍉'];

function formatCurrency(value) {
	return Math.trunc(value).toLocaleString('pt-BR');
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cacaniquem')
		.setDescription('Tente a sorte na máquina de caça-níqueis!'),

	async execute(interaction) {
		await interaction.deferReply();

		if (!interaction.guild) {
			return interaction.editReply('Esse comando só funciona em servidor.');
		}

		try {
			const members = getMembersCollection();
			const userRef = members.doc(interaction.user.id);
			const userSnapshot = await userRef.get();
			const data = userSnapshot.exists ? userSnapshot.data() : {};
			const creditos = typeof data.credits === 'number' ? data.credits : 0;

			if (creditos < CUSTO_POR_JOGADA) {
				return interaction.editReply('Você não tem créditos suficientes para girar a máquina.');
			}

			const rolo1 = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];
			const rolo2 = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];
			const rolo3 = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];

			const ganhou = rolo1 === rolo2 && rolo2 === rolo3;
			const premio = ganhou ? Math.floor(Math.random() * (20000 - 5000 + 1)) + 5000 : 0;
			const ajusteSaldo = ganhou ? premio - CUSTO_POR_JOGADA : -CUSTO_POR_JOGADA;

			await userRef.set({ credits: creditos + ajusteSaldo }, { merge: true });

			const embed = new EmbedBuilder()
				.setTitle('🎰 Máquina de Caça-Níqueis 🎰')
				.setDescription(`**Resultado:**\n${rolo1} | ${rolo2} | ${rolo3}`)
				.setColor(0xff0000)
				.setFooter({
					text: 'Boa sorte na próxima rodada!',
					iconURL: interaction.user.displayAvatarURL({ size: 64 })
				});

			if (ganhou) {
				embed.addFields({
					name: 'Parabéns!',
					value: `Você ganhou **C$ ${formatCurrency(premio)}!**`,
					inline: false
				});
			} else {
				embed.addFields({
					name: 'TROUXA!',
					value: `Você perdeu **C$ ${formatCurrency(CUSTO_POR_JOGADA)}!**`,
					inline: false
				});
			}

			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('[CACANIQUEM] Erro ao processar máquina:', error);
			return interaction.editReply('Ocorreu um erro ao tentar executar a máquina.');
		}
	}
};
