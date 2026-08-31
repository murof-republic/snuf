const { Events, MessageFlags, Collection } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(
                interaction.commandName
            );

            if (!command || !command.autocomplete) return;

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error('Erro no autocomplete:', error);
            }

            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(
            interaction.commandName
        );

        if (!command) {
            console.error(
                `Não foi encontrado nenhum comando correspondente a ${interaction.commandName}.`
            );
            return;
        }

        const { cooldowns } = interaction.client;

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = 3;
        const cooldownAmount =
            (command.cooldown ?? defaultCooldownDuration) * 1_000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime =
                timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const expiredTimestamp = Math.round(
                    expirationTime / 1_000
                );

                return interaction.reply({
                    content: `Aguarde, você está em um tempo de espera para usar o comando ${command.data.name} novamente. Você poderá usá-lo novamente <t:${expiredTimestamp}:R>.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        timestamps.set(interaction.user.id, now);

        setTimeout(() => {
            timestamps.delete(interaction.user.id);
        }, cooldownAmount);

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);

            if (interaction.replied || interaction.deferred) {
                try {
                    await interaction.followUp({
                        content: 'Houve um erro ao executar este comando!',
                        flags: MessageFlags.Ephemeral,
                    });
                } catch (followUpError) {
                    console.error(
                        'Erro ao enviar mensagem de erro:',
                        followUpError
                    );
                }
            } else {
                try {
                    await interaction.reply({
                        content: 'Houve um erro ao executar este comando!',
                        flags: MessageFlags.Ephemeral,
                    });
                } catch (replyError) {
                    console.error(
                        'Erro ao enviar mensagem de erro:',
                        replyError
                    );
                }
            }
        }
    },
};