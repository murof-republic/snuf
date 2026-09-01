const { MessageFlags } = require('discord.js');



function replyEphemeral(interaction, content) {
	if (!interaction || typeof interaction.reply !== 'function') {
		console.error('[UTIL] Interação inválida para replyEphemeral');
		return Promise.reject(new Error('Interação inválida'));
	}

	return interaction.reply({
		content,
		flags: MessageFlags.Ephemeral,
	}).catch(error => {
		console.error('[UTIL] Erro ao responder efêmero:', error.message);
	});
}



function requireAdmin(interaction, returnOnly = false) {
	if (!interaction) {
		console.warn('[UTIL] Interação nula em requireAdmin');
		return false;
	}

	const isAdmin = interaction.memberPermissions?.has('Administrator');

	if (!isAdmin && !returnOnly) {
		replyEphemeral(
			interaction,
			'Você precisa ser administrador para usar este comando.'
		).catch(() => {});
	}

	return isAdmin;
}

function requireGuild(interaction, guildId, message = 'Comando indisponível neste servidor.') {
	if (!interaction) {
		console.warn('[UTIL] Interação nula em requireGuild');
		return false;
	}

	if (!guildId) {
		console.warn('[UTIL] Guild ID não fornecido');
		return false;
	}

	const isCorrectGuild = interaction.guildId === guildId;

	if (!isCorrectGuild) {
		replyEphemeral(interaction, `Erro: ${message}`).catch(() => {});
	}

	return isCorrectGuild;
}

function requireInVoiceChannel(
	interaction,
	channelId = null,
	message = 'Você precisa estar em um canal de voz para usar este comando.'
) {
	if (!interaction) {
		console.warn('[UTIL] Interação nula em requireInVoiceChannel');
		return false;
	}

	const memberChannelId = interaction.member?.voice?.channelId;

	if (!memberChannelId) {
		replyEphemeral(interaction, `Erro: ${message}`).catch(() => {});
		return false;
	}

	if (channelId && memberChannelId !== channelId) {
		replyEphemeral(
			interaction,
			'Erro: Você precisa estar no canal de voz correto para usar este comando.'
		).catch(() => {});
		return false;
	}

	return true;
}

function requireUser(interaction) {
	if (!interaction?.user?.id) {
		console.warn('[UTIL] Usuário inválido em requireUser');
		return false;
	}

	return true;
}



function errorReply(interaction, error, message = 'Ocorreu um erro ao processar seu comando.') {
	console.error(`[UTIL] Erro no comando:`, error?.message || error);

	return replyEphemeral(
		interaction,
		`Erro: ${message}`
	);
}

module.exports = {
	replyEphemeral,
	requireAdmin,
	requireGuild,
	requireInVoiceChannel,
	requireUser,
	errorReply
};

module.exports = {
    replyEphemeral,
    requireAdmin,
    requireGuild,
    requireInVoiceChannel,
};
