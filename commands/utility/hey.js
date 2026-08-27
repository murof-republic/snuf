const { SlashCommandBuilder } = require('discord.js');
const { chat } = require('../../services/foundry');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hey')
        .setDescription('Converse com o snuf.')
        .addStringOption(option =>
            option
                .setName('mensagem')
                .setDescription('Envie uma mensagem.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const mensagem = interaction.options.getString('mensagem', true);

        await interaction.deferReply();

        try {
            const resposta = await chat(
                interaction.user.id,
                mensagem
            );

            await interaction.editReply(
                resposta || 'Não consegui pensar em uma resposta.'
            );
        } catch (error) {
            console.error('Erro ao conversar com o Snuf:', error);

            await interaction.editReply(
                'O Snuf está com problemas para responder agora.'
            );
        }
    }
};