const { Events } = require('discord.js');
const foundry = require('../services/foundry');

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

        const match = message.content.match(/\bsnuf/i);
        if (!match) return;

        const content = message.content
            .replace(/\bsnuf/i, '')
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
            console.error("Erro, o Foundry colapsou!")
        }    
    }
};