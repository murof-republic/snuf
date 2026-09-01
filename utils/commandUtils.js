const { MessageFlags } = require('discord.js');

function replyEphemeral(interaction, content) {
    return interaction.reply({
        content,
        flags: MessageFlags.Ephemeral,
    });
}

function requireAdmin(interaction) {
    if (interaction.memberPermissions?.has('Administrator')) {
        return true;
    }

    return replyEphemeral(
        interaction,
        'Você precisa ser administrador para usar este comando.'
    );
}

function requireGuild(interaction, guildId, message = 'Comando indisponível neste servidor.') {
    if (interaction.guildId === guildId) {
        return true;
    }

    return replyEphemeral(interaction, message);
}

function requireInVoiceChannel(interaction, channelId = null, message = 'Você precisa estar em um canal de voz para usar este comando.') {
    const memberChannelId = interaction.member?.voice?.channelId;

    if (!memberChannelId) {
        return replyEphemeral(interaction, message);
    }

    if (channelId && memberChannelId !== channelId) {
        return replyEphemeral(
            interaction,
            'Você precisa estar no canal de voz da rádio para usar este comando.'
        );
    }

    return true;
}

module.exports = {
    replyEphemeral,
    requireAdmin,
    requireGuild,
    requireInVoiceChannel,
};
