const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require('discord.js');

const sharp = require('sharp');

const { murofDb } = require('../../services/firebase');
const { enviarR2 } = require('../../services/r2');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('arte')
        .setDescription('Registro de artes no site do servidor.')
        .addStringOption(option =>
            option
                .setName('nome')
                .setDescription('Nome da arte.')
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName('autor')
                .setDescription('Artista responsável pela arte.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('id')
                .setDescription('ID da mensagem que contém a arte.')
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

        const nome = interaction.options.getString('nome');
        const autor = interaction.options.getUser('autor');
        const id = interaction.options.getString('id');

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const canal = interaction.channel;

        if (!canal || !canal.isTextBased()) {
            return interaction.editReply(
                'Não foi possível acessar o canal.'
            );
        }

        let mensagem;

        try {
            mensagem = await canal.messages.fetch(id);
        } catch {
            return interaction.editReply(
                'Não foi possível encontrar a mensagem.'
            );
        }

        const imagem = mensagem.attachments.find(attachment =>
            attachment.contentType?.startsWith('image/')
        );

        if (!imagem) {
            return interaction.editReply(
                'A mensagem não possui uma imagem.'
            );
        }

        let resposta;

        try {
            resposta = await fetch(imagem.url);
        } catch {
            return interaction.editReply(
                'Não foi possível baixar a arte.'
            );
        }

        if (!resposta.ok) {
            return interaction.editReply(
                'Não foi possível baixar a arte.'
            );
        }

        const arquivo = Buffer.from(
            await resposta.arrayBuffer()
        );

        const webp = await sharp(arquivo)
            .resize({
                width: 2560,
                height: 2560,
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({
                quality: 85
            })
            .toBuffer();

        const url = await enviarR2({
            arquivo: webp,
            caminho: `artes/${id}.webp`,
            tipo: 'image/webp'
        });

        await murofDb
            .collection('artes')
            .doc()
            .set({
                nome,
                autor: autor.displayName,
                id_autor: autor.id,
                url
            });

        return interaction.editReply(
            'Arte cadastrada com sucesso.'
        );
    }
};