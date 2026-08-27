const { Events } = require('discord.js');
const foundry = require('../services/foundry');

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

        const match = message.content.match(/\bsnuf\b/i); 

        const mentioned = message.mentions.has(message.client.user); 

        let reply = false;

        if(message.reference?.messageId) {
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

        if (!content) return;

        try {
            await message.channel.sendTyping();
            const response = await foundry.chat(
                message.author.id,
                content
            );

            await message.reply(response);
        } catch (error) {
            console.error("Erro, o Foundry colapsou!", error);
        }    
    }
};