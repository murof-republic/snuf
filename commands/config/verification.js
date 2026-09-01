const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requireAdmin, requireGuild, replyEphemeral } = require('../../utils/commandUtils');

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const VERIFY_ROLE_ID = process.env.VERIFY_ROLE_ID;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verificar')
        .setDescription('Verifica um user manualmente.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User que será verificado.')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!requireAdmin(interaction)) return;
        if (!requireGuild(interaction, GUILD_ID)) return;

        const membro = interaction.options.getMember('user');

        if (!membro) {
            return replyEphemeral(interaction, 'Não consegui encontrar esse membro.');
        }

        const role = interaction.guild.roles.cache.get(VERIFY_ROLE_ID);

        if (!role) {
            return replyEphemeral(interaction, 'Cargo de verificado não encontrado.');
        }

        if (membro.roles.cache.has(VERIFY_ROLE_ID)) {
            return replyEphemeral(interaction, 'Este membro já está verificado.');
        }

        try {
            await membro.roles.add(role, 'Verificação manual');
            return replyEphemeral(interaction, `${membro} foi verificado.`);
        } catch (error) {
            console.error('Erro ao verificar membro:', error);
            return replyEphemeral(
                interaction,
                'Não consegui verificar esse membro. Verifique as permissões do bot e a posição do cargo.'
            );
        }
    }
};