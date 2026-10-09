const { Events } = require('discord.js');
const foundry = require('../services/foundry');
const { buildAiContext } = require('../services/aiContext');
const { parseAiReply } = require('../services/aiReply');
const { collectTextAttachments } = require('../services/aiAttachments');

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
        let replyContext = null;

        if (message.reference?.messageId) {
            const repliedMessage = await message.channel.messages.fetch(
                message.reference.messageId
            );

            reply = repliedMessage.author.id === message.client.user.id;

            if (reply) {
                replyContext = await foundry.loadBotMessageContext(repliedMessage.id);
                replyContext ||= {
                    mensagemId: repliedMessage.id,
                    texto: repliedMessage.content
                };
            }
        }

        if (!match && !mentioned && !reply) return;

        const content = message.content
            .replace(/\bsnuf\b/gi, '')
            .replace(`<@${message.client.user.id}>`, '')
            .replace(`<@!${message.client.user.id}>`, '')
            .trim();

        if ((!content && message.attachments.size === 0 && !replyContext) || content.length > AI_MAX_CHARS) return;

        const now = Date.now();
        const lastCall = userCooldowns.get(message.author.id);

        if (lastCall && now - lastCall < AI_RATE_LIMIT_MS) {
            return;
        }

        userCooldowns.set(message.author.id, now);
        setTimeout(() => userCooldowns.delete(message.author.id), AI_RATE_LIMIT_MS);

        try {
            await message.channel.sendTyping();

            const attachments = await collectTextAttachments(message.attachments);

            const response = await foundry.chat(
                message.author.id,
                content,
                buildAiContext({
                    guild: message.guild,
                    channel: message.channel,
                    member: message.member,
                    client: message.client,
                    attachments,
                    replyContext
                })
            );

            const parsedReply = parseAiReply(response.text, response.files);
            const sentMessage = await message.reply(parsedReply);

            await foundry.saveBotMessageContext(sentMessage.id, {
                autorId: message.author.id,
                texto: parsedReply.content
            });
        } catch (error) {
            console.error(error);
        }
    }
};