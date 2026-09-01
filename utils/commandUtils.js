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

    replyEphemeral(
        interaction,
        'Você precisa ser administrador para usar este comando.'
    ).catch(() => {});

    return false;
}

function requireGuild(interaction, guildId, message = 'Comando indisponível neste servidor.') {
    if (interaction.guildId === guildId) {
        return true;
    }

    replyEphemeral(interaction, message).catch(() => {});

    return false;
}

function requireInVoiceChannel(interaction, channelId = null, message = 'Você precisa estar em um canal de voz para usar este comando.') {
    const memberChannelId = interaction.member?.voice?.channelId;

    if (!memberChannelId) {
        replyEphemeral(interaction, message).catch(() => {});
        return false;
    }

    if (channelId && memberChannelId !== channelId) {
        replyEphemeral(
            interaction,
            'Você precisa estar no canal de voz da rádio para usar este comando.'
        ).catch(() => {});
        return false;
    }

    return true;
}

module.exports = {
    replyEphemeral,
    requireAdmin,
    requireGuild,
    requireInVoiceChannel,
};
