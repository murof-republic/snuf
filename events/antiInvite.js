const { Events } = require('discord.js');

const GUILD_ID = process.env.DISCORD_GUILD_ID;

const INVITE_REGEX =
    /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]+)/gi;

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        if (message.guild.id !== GUILD_ID) return;

        const content = message.content || '';

        if (!content) return;

        const matches = [...content.matchAll(INVITE_REGEX)];

        if (!matches.length) return;

        for (const match of matches) {
            const code = match[1];

            try {
                const invite = await message.client.fetchInvite(code);
                const inviteGuildId = invite.guild?.id;

                if (!inviteGuildId) continue;

                if (inviteGuildId === GUILD_ID) {
                    continue;
                }

                await message.delete();
                return;
            } catch (error) {
                if (error.code === 10003) continue;

                console.error(
                    `Erro ao verificar convite ${code}:`,
                    error
                );
            }
        }
    }
};