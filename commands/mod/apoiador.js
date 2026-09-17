const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { murofDb } = require('../../services/firebase');
const { enviarR2 } = require('../../services/r2');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apoiador')
        .setDescription('Registro de apoiadores no site do servidor.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Usuário.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('descrição')
                .setDescription('Descrição do usuário.')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName('artista')
                .setDescription('Define se o user e artista.')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.guildId !== process.env.DISCORD_GUILD_ID) {
            return interaction.reply({
                content: 'Este comando não pode ser usado aqui.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: 'Você não tem permissão para usar este comando.',
                flags: MessageFlags.Ephemeral
            });
        }

        const user = interaction.options.getUser('user');
        const descrição = interaction.options.getString('descrição');
        const artista = interaction.options.getBoolean('artista');

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const resposta = await fetch(
            user.displayAvatarURL({
                extension: 'webp',
                size: 1024
            })
        );

        if (!resposta.ok) {
            return interaction.editReply(
                'Não foi possível baixar o avatar.'
            );
        }

        const arquivo = Buffer.from(
            await resposta.arrayBuffer()
        );

        const url = await enviarR2({
            arquivo,
            caminho: `avatares/${user.id}.webp`,
            tipo: 'image/webp'
        });

        const ref = murofDb
            .collection('apoiadores')
            .doc(user.id);

        const existente = await ref.get();

        await ref.set({
            nome: user.displayName,
            descrição,
            artista,
            avatar: url
        });

        return interaction.editReply(
            existente.exists
                ? 'Apoiador atualizado com sucesso.'
                : 'Apoiador cadastrado com sucesso.'
        );
    }
};