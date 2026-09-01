const { Events, MessageFlags, Collection } = require('discord.js');
const logger = require('../utils/logger');

const DEFAULT_COOLDOWN = 3;

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
				logger.error('INTERACTION', `Erro no autocomplete ${interaction.commandName}`, error);
			}

			return;
		}

		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(
			interaction.commandName
		);

		if (!command) {
			logger.warn('INTERACTION', `Comando não encontrado: ${interaction.commandName}`);
			return;
		}



		const { cooldowns } = interaction.client;

		if (!cooldowns.has(command.data.name)) {
			cooldowns.set(command.data.name, new Collection());
		}

		const now = Date.now();
		const timestamps = cooldowns.get(command.data.name);
		const cooldownAmount = (command.cooldown ?? DEFAULT_COOLDOWN) * 1_000;

		if (timestamps.has(interaction.user.id)) {
			const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

			if (now < expirationTime) {
				const expiredTimestamp = Math.round(expirationTime / 1_000);

				return interaction.reply({
					content: `Cooldown ativo. Tente novamente <t:${expiredTimestamp}:R>.`,
					flags: MessageFlags.Ephemeral,
				}).catch(error => {
					logger.error('INTERACTION', 'Erro ao enviar mensagem de cooldown', error);
				});
			}
		}

		timestamps.set(interaction.user.id, now);

		setTimeout(() => {
			timestamps.delete(interaction.user.id);
		}, cooldownAmount);



		try {
			logger.debug('INTERACTION', `Executando comando: ${command.data.name} por ${interaction.user.username}`);

			await command.execute(interaction);

			logger.debug('INTERACTION', `Comando ${command.data.name} executado com sucesso`);

		} catch (error) {
			logger.error('INTERACTION', `Erro ao executar comando ${command.data.name}`, error);

			const errorMessage = 'Houve um erro ao executar este comando!';

			try {
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: errorMessage,
						flags: MessageFlags.Ephemeral,
					});
				} else {
					await interaction.reply({
						content: errorMessage,
						flags: MessageFlags.Ephemeral,
					});
				}
			} catch (responseError) {
				logger.error('INTERACTION', 'Erro ao enviar mensagem de erro', responseError);
			}
		}
	}
};
