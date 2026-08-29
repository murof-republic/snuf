const { SlashCommandBuilder } = require('discord.js');
const { chat } = require('../../services/foundry');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hey')
        .setDescription('Converse com o Snuf.')
        .addStringOption(option =>
            option
                .setName('mensagem')
                .setDescription('Envie uma mensagem.')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (interaction.guildId !== process.env.DISCORD_GUILD_ID) {
            return interaction.reply({
                content: 'Esse comando não está disponível neste servidor.',
                ephemeral: true
            });
        }

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