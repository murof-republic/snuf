const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responde com Pong!'),

    async execute(interaction) {
        const start = Date.now();

        await interaction.reply('🏓 Pong!');

        const latency = Date.now() - start;

        await interaction.editReply(`🏓 Pong! ${latency}ms`);
    },
};