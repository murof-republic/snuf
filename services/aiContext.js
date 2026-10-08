const MAX_MEMBERS = 60;
const MAX_CHANNELS = 40;

function clean(value, maxLength = 120) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function buildAiContext({ guild, channel, member, client }) {
    const members = [...guild.members.cache.values()]
        .filter(currentMember => !currentMember.user.bot)
        .sort((first, second) =>
            clean(first.displayName).localeCompare(clean(second.displayName))
        )
        .slice(0, MAX_MEMBERS)
        .map(currentMember => ({
            id: currentMember.id,
            nome: clean(currentMember.displayName),
            cargos: currentMember.roles.cache
                .filter(role => role.id !== guild.id)
                .map(role => clean(role.name, 60))
                .slice(0, 8),
            status: currentMember.presence?.status || 'offline',
            voz: currentMember.voice.channel
                ? clean(currentMember.voice.channel.name)
                : null
        }));

    const channels = [...guild.channels.cache.values()]
        .filter(currentChannel => currentChannel.viewable)
        .sort((first, second) => first.position - second.position)
        .slice(0, MAX_CHANNELS)
        .map(currentChannel => ({
            nome: clean(currentChannel.name),
            tipo: currentChannel.type,
            categoria: clean(currentChannel.parent?.name) || null
        }));

    return {
        servidor: {
            id: guild.id,
            nome: clean(guild.name),
            dono: guild.ownerId,
            totalMembros: guild.memberCount,
            membrosDisponiveisNoCache: members.length
        },
        localizacao: {
            canal: clean(channel.name),
            categoria: clean(channel.parent?.name) || null,
            tipo: channel.type,
            topico: clean(channel.topic, 240) || null,
            membroNaVoz: member.voice.channel
                ? clean(member.voice.channel.name)
                : null
        },
        pessoa: {
            id: member.id,
            nome: clean(member.displayName),
            cargos: member.roles.cache
                .filter(role => role.id !== guild.id)
                .map(role => clean(role.name, 60))
                .slice(0, 8),
            bot: member.user.bot
        },
        bot: {
            nome: clean(client.user.username),
            id: client.user.id
        },
        membros: members,
        canaisVisiveis: channels,
        horario: new Date().toISOString()
    };
}

module.exports = {
    buildAiContext
};