const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildsCollection } = require('../../services/firebase');
const { requireAdmin, replyEphemeral } = require('../../utils/commandUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Configura o dashboard do servidor de Minecraft.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
        .addChannelOption(option =>
            option
                .setName('canal')
                .setDescription('Canal onde o dashboard será enviado.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('servidor')
                .setDescription('IP ou domínio do servidor Minecraft, com porta opcional.')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!requireAdmin(interaction)) return;

        const channel = interaction.options.getChannel('canal', true);
        const server = interaction.options
            .getString('servidor', true)
            .trim();

        try {
            const guilds = getGuildsCollection();

            await guilds.doc(interaction.guild.id).set({
                minecraft: {
                    channelId: channel.id,
                    server
                }
            }, { merge: true });

            await replyEphemeral(
                interaction,
                `O dashboard do Minecraft será enviado em ${channel} para o servidor \`${server}\`.\n*Pode demorar até 5 minutos para o dashboard aparecer, tenha calma.*`
            );
        } catch (error) {
            console.error('Erro ao configurar o dashboard do Minecraft:', error);
            await replyEphemeral(interaction, 'Não consegui salvar a configuração do dashboard.');
        }
    }
};