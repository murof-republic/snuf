const { Events } = require('discord.js');

const { murofDb } = require('../services/firebase');
const { enviarR2 } = require('../services/r2');

module.exports = {
    name: Events.UserUpdate,

    async execute(oldUser, newUser) {
        try {
            const ref = murofDb
                .collection('apoiadores')
                .doc(newUser.id);

            const snapshot = await ref.get();

            if (!snapshot.exists) {
                return;
            }

            const dados = snapshot.data();
            const atualizacoes = {};

            if (oldUser.displayName !== newUser.displayName) {
                atualizacoes.nome = newUser.displayName;
            }

            if (oldUser.avatar !== newUser.avatar) {
                const resposta = await fetch(
                    newUser.displayAvatarURL({
                        extension: 'webp',
                        size: 1024
                    })
                );

                if (!resposta.ok) {
                    throw new Error('Não foi possível baixar o novo avatar.');
                }

                const arquivo = Buffer.from(
                    await resposta.arrayBuffer()
                );

                const url = await enviarR2({
                    arquivo,
                    caminho: `avatares/${newUser.id}.webp`,
                    tipo: 'image/webp'
                });

                atualizacoes.avatar = url;
            }

            if (Object.keys(atualizacoes).length === 0) {
                return;
            }

            await ref.update(atualizacoes);

            console.log(
                `[APOIADOR] ${newUser.displayName} atualizado.`
            );
        } catch (error) {
            console.error(
                '[APOIADOR] Erro ao atualizar usuário:',
                error.message
            );
        }
    }
};