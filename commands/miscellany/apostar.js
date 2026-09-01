const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMembersCollection } = require('../../services/firebase');

function parseValor(raw) {
	if (typeof raw !== 'string') {
		return null;
	}

	const normalized = raw.replace(/\./g, '').replace(',', '');
	const value = Number.parseInt(normalized, 10);

	return Number.isFinite(value) ? value : null;
}

function formatCurrency(value) {
	return Math.trunc(value).toLocaleString('pt-BR');
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('apostar')
		.setDescription('Aposte um valor e teste sua sorte!')
		.addStringOption(option =>
			option
				.setName('valor')
				.setDescription('Valor para apostar (ex.: 10.000)')
				.setRequired(true)
		),

	async execute(interaction) {
		await interaction.deferReply();

		if (!interaction.guild) {
			return interaction.editReply('Esse comando só funciona em servidor.');
		}

		const member = await interaction.guild.members
			.fetch(interaction.user.id)
			.catch(() => null);

		if (!member) {
			return interaction.editReply('Ops, não consegui te identificar no servidor. Tente novamente.');
		}

		const valorApostado = parseValor(interaction.options.getString('valor'));

		if (!valorApostado || valorApostado <= 0) {
			return interaction.editReply('Por favor, insira um valor válido para apostar.');
		}

		if (valorApostado < 1000) {
			return interaction.editReply('O valor mínimo para apostar é **C$ 1.000**.');
		}

		try {
			const members = getMembersCollection();
			const userRef = members.doc(interaction.user.id);
			const userSnapshot = await userRef.get();
			const data = userSnapshot.exists ? userSnapshot.data() : {};
			const creditos = typeof data.credits === 'number' ? data.credits : 0;

			if (creditos < valorApostado) {
				return interaction.editReply('Você não tem créditos suficientes para apostar.');
			}

			const chance = Math.random();
			let embed;

			if (chance < 0.4) {
				const multiplicador = Number((Math.random() * (3.5 - 1.5) + 1.5).toFixed(2));
				const ganho = Math.floor(valorApostado * multiplicador);
				const delta = ganho - valorApostado;
				await userRef.set({ credits: creditos + delta }, { merge: true });

				embed = new EmbedBuilder()
					.setTitle('Parabéns, você ganhou!')
					.setDescription(
						`Você apostou **C$ ${formatCurrency(valorApostado)}**\n` +
						`e ganhou **C$ ${formatCurrency(ganho)}**!`
					)
					.setColor(0x32cd32)
					.addFields({
						name: 'Multiplicador',
						value: `**${multiplicador}x**`,
						inline: false
					});
			} else if (chance < 0.7) {
				const perda = Math.floor(valorApostado / 2);
				await userRef.set({ credits: creditos - perda }, { merge: true });

				embed = new EmbedBuilder()
					.setTitle('Metade da aposta!')
					.setDescription(
						'Você perdeu **metade da aposta**\n' +
						`e ficou com **C$ ${formatCurrency(valorApostado - perda)}**.`
					)
					.setColor(0xffa500);
			} else {
				await userRef.set({ credits: creditos - valorApostado }, { merge: true });

				embed = new EmbedBuilder()
					.setTitle('Você perdeu tudo!')
					.setDescription(
						`**C$ ${formatCurrency(valorApostado)}** foram perdidos.\n` +
						'Boa sorte na próxima!'
					)
					.setColor(0xff0000);
			}

			embed.setFooter({
				text: 'Por que não tentar mais uma vez?',
				iconURL: member.displayAvatarURL({ size: 64 })
			});

			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('[APOSTAR] Erro ao processar aposta:', error);
			return interaction.editReply('Ocorreu um erro ao tentar realizar a aposta.');
		}
	}
};
