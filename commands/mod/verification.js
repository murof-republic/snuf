const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require('discord.js');

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const VERIFY_ROLE_ID = process.env.VERIFY_ROLE_ID;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verificar')
        .setDescription('Verifica um user manualmente.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator.toString()
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User que será verificado.')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (interaction.guildId !== GUILD_ID) {
            return interaction.reply({
                content: 'Comando indisponível neste servidor.',
                flags: MessageFlags.Ephemeral
            });
        }

        const membro = interaction.options.getMember('user');

        if (!membro) {
            return interaction.reply({
                content: 'Não consegui encontrar esse membro.',
                flags: MessageFlags.Ephemeral
            });
        }

        const role = interaction.guild.roles.cache.get(VERIFY_ROLE_ID);

        if (!role) {
            return interaction.reply({
                content: 'Cargo de verificado não encontrado.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (membro.roles.cache.has(VERIFY_ROLE_ID)) {
            return interaction.reply({
                content: 'Este membro já está verificado.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await membro.roles.add(role, 'Verificação manual');

            await interaction.reply({
                content: `${membro} foi verificado.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Erro ao verificar membro:', error);

            await interaction.reply({
                content: 'Não consegui verificar esse membro. Verifique as permissões do bot e a posição do cargo.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};