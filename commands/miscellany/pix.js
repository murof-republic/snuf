const { SlashCommandBuilder } = require('discord.js');
const { getMembersCollection } = require('../../services/firebase');

function formatCurrency(value) {
	return Math.trunc(value).toLocaleString('pt-BR');
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pix')
		.setDescription('Faça um pix para outro User.')
		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('User para enviar o pix')
				.setRequired(true)
		)
		.addIntegerOption(option =>
			option
				.setName('valor')
				.setDescription('Valor para transferir')
				.setRequired(true)
		),

	async execute(interaction) {
		await interaction.deferReply();

		if (!interaction.guild) {
			return interaction.editReply('Esse comando só funciona em servidor.');
		}

		const remetente = interaction.user;
		const destinatario = interaction.options.getUser('user');
		const valor = interaction.options.getInteger('valor');

		if (!destinatario) {
			return interaction.editReply('User inválido para realizar o pix.');
		}

		if (remetente.id === destinatario.id) {
			return interaction.editReply('Não é possível transferir para si mesmo.');
		}

		if (!valor || valor <= 0) {
			return interaction.editReply('Valor inválido.');
		}

		try {
			const members = getMembersCollection();
			const remetenteRef = members.doc(remetente.id);
			const destinatarioRef = members.doc(destinatario.id);
			const remetenteSnapshot = await remetenteRef.get();
			const destinatarioSnapshot = await destinatarioRef.get();
			const remetenteSaldo = remetenteSnapshot.exists && typeof remetenteSnapshot.data().credits === 'number'
				? remetenteSnapshot.data().credits
				: 0;
			const destinatarioSaldo = destinatarioSnapshot.exists && typeof destinatarioSnapshot.data().credits === 'number'
				? destinatarioSnapshot.data().credits
				: 0;

			if (remetenteSaldo < valor) {
				return interaction.editReply('Saldo insuficiente para realizar a transferência.');
			}

			await remetenteRef.set({ credits: remetenteSaldo - valor }, { merge: true });
			await destinatarioRef.set({ credits: destinatarioSaldo + valor }, { merge: true });

			return interaction.editReply(
				`*${remetente} enviou **C$ ${formatCurrency(valor)}** para ${destinatario}...*`
			);
		} catch (error) {
			console.error('[PIX] Erro ao processar transferência:', error);
			try {
				const members = getMembersCollection();
				const remetenteRef = members.doc(remetente.id);
				const remetenteSnapshot = await remetenteRef.get();
				const saldoAtual = remetenteSnapshot.exists && typeof remetenteSnapshot.data().credits === 'number'
					? remetenteSnapshot.data().credits
					: 0;
				await remetenteRef.set({ credits: saldoAtual + valor }, { merge: true });
			} catch (rollbackError) {
				console.error('[PIX] Falha ao reverter transferência:', rollbackError);
			}

			return interaction.editReply('Ocorreu um erro ao tentar realizar a transferência.');
		}
	}
};
