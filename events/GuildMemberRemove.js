const { Events } = require('discord.js');

const guilds = require('../services/guilds');

module.exports = {
    name: Events.GuildMemberRemove,

    async execute(member) {
        try {
            const config = await guilds.get(member.guild.id);

            if (
                !config?.goodbye?.enabled ||
                !config.goodbye.channelId ||
                !config.goodbye.message
            ) {
                return;
            }

            const channel = member.guild.channels.cache.get(
                config.goodbye.channelId
            );

            if (!channel) return;

            const message = config.goodbye.message.replace(
                '{user}',
                member.user.username
            );

            await channel.send(message);
        } catch (error) {
            console.error(
                'Erro ao processar saída de membro:',
                error
            );
        }
    },
};