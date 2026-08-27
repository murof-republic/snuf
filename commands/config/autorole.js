const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} = require('discord.js');

const guilds = require('../../services/guilds');

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
        const role = interaction.options.getRole('cargo', true);

        if (role.managed) {
            return interaction.reply({
                content: 'Esse cargo não pode ser atribuído pelo bot.',
                flags: MessageFlags.Ephemeral,
            });
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                content: 'Não consigo atribuir esse cargo porque ele está acima ou no mesmo nível do meu maior cargo.',
                flags: MessageFlags.Ephemeral,
            });
        }

        await guilds.update(interaction.guild.id, {
            autorole: {
                enabled: true,
                roleId: role.id,
            },
        });

        await interaction.reply({
            content: `O cargo automático foi configurado como ${role}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};