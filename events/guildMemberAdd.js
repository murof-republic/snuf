const { Events } = require('discord.js');

const guilds = require('../services/guilds');

module.exports = {
    name: Events.GuildMemberAdd,

    async execute(member) {
        try {
            const config = await guilds.get(member.guild.id);


            if (config?.autorole?.enabled && config.autorole.roleId) {
                const role = member.guild.roles.cache.get(
                    config.autorole.roleId
                );

                if (role) {
                    await member.roles.add(role);
                }
            }


            if (
                !config?.welcome?.enabled ||
                !config.welcome.channelId ||
                !config.welcome.message
            ) {
                return;
            }

            const channel = member.guild.channels.cache.get(
                config.welcome.channelId
            );

            if (!channel) return;

            const message = config.welcome.message.replace(
                '{user}',
                `${member}`
            );

            await channel.send(message);
        } catch (error) {
            console.error('Erro ao processar entrada de membro:', error);
        }
    },
};