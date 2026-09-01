const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const guilds = require('../../services/guilds');
const { requireAdmin, replyEphemeral } = require('../../utils/commandUtils');

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Configura o cargo automático para novos membros.')
        .addRoleOption(option =>
            option
                .setName('cargo')
                .setDescription('Cargo que será dado aos novos membros.')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!requireAdmin(interaction)) return;

        const role = interaction.options.getRole('cargo', true);

        if (role.managed) {
            return replyEphemeral(
                interaction,
                'Esse cargo não pode ser atribuído pelo bot.'
            );
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return replyEphemeral(
                interaction,
                'Não consigo atribuir esse cargo porque ele está acima ou no mesmo nível do meu maior cargo.'
            );
        }

        await guilds.update(interaction.guild.id, {
            autorole: {
                enabled: true,
                roleId: role.id,
            },
        });

        await replyEphemeral(
            interaction,
            `O cargo automático foi configurado como ${role}.`
        );
    },
};