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
        .setName('welcome')
        .setDescription('Configura o sistema de boas-vindas.')
        .addChannelOption(option =>
            option
                .setName('canal')
                .setDescription('Canal onde as boas-vindas serão enviadas.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('mensagem')
                .setDescription('Mensagem de boas-vindas. Use {user} para mencionar o membro.')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('canal', true);
        const message = interaction.options.getString('mensagem', true);

        await guilds.update(interaction.guild.id, {
            welcome: {
                enabled: true,
                channelId: channel.id,
                message,
            },
        });

        await interaction.reply({
            content: `Sistema de boas-vindas configurado em ${channel}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};