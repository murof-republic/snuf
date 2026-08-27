const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} = require('discord.js');

const guilds = require('../../services/guilds');

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('goodbye')
        .setDescription('Configura o sistema de mensagens de saída.')
        .addChannelOption(option =>
            option
                .setName('canal')
                .setDescription('Canal onde as mensagens de saída serão enviadas.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('mensagem')
                .setDescription('Mensagem de saída. Use {user} para mencionar o membro.')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('canal', true);
        const message = interaction.options.getString('mensagem', true);

        await guilds.update(interaction.guild.id, {
            goodbye: {
                enabled: true,
                channelId: channel.id,
                message,
            },
        });

        await interaction.reply({
            content: `Sistema de mensagens de saída configurado em ${channel}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};