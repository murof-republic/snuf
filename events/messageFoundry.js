const { Events } = require('discord.js');
const foundry = require('../services/foundry');

const AI_RATE_LIMIT_MS = 8_000;
const AI_MAX_CHARS = 500;
const userCooldowns = new Map();

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

        if (
            !message.guild ||
            message.guild.id !== process.env.DISCORD_GUILD_ID
        ) return;

        const match = message.content.match(/\bsnuf\b/i);
        const mentioned = message.mentions.has(message.client.user);

        let reply = false;

        if (message.reference?.messageId) {
            const repliedMessage = await message.channel.messages.fetch(
                message.reference.messageId
            );

            reply = repliedMessage.author.id === message.client.user.id;
        }

        if (!match && !mentioned && !reply) return;

        const content = message.content
            .replace(/\bsnuf\b/gi, '')
            .replace(`<@${message.client.user.id}>`, '')
            .replace(`<@!${message.client.user.id}>`, '')
            .trim();

        if (!content || content.length > AI_MAX_CHARS) return;

        const now = Date.now();
        const lastCall = userCooldowns.get(message.author.id);

        if (lastCall && now - lastCall < AI_RATE_LIMIT_MS) {
            return;
        }

        userCooldowns.set(message.author.id, now);
        setTimeout(() => userCooldowns.delete(message.author.id), AI_RATE_LIMIT_MS);

        try {
            await message.channel.sendTyping();

            const response = await foundry.chat(
                message.author.id,
                content
            );

            await message.reply(response);
        } catch (error) {
            console.error(error);
        }
    }
};