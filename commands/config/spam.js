const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const guilds = require('../../services/guilds');
const antiSpam = require('../../services/antiSpam');
const { requireAdmin, replyEphemeral } = require('../../utils/commandUtils');

module.exports = {
	cooldown: 5,

	data: new SlashCommandBuilder()
		.setName('spam')
		.setDescription('Ativa ou desativa a proteção contra spam.')
		.addBooleanOption(option =>
			option
				.setName('ativado')
				.setDescription('Ativar a proteção?')
				.setRequired(true)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction) {
		if (!requireAdmin(interaction)) return;

		const enabled = interaction.options.getBoolean('ativado', true);

		await guilds.update(interaction.guild.id, {
			spam: {
				enabled,
			},
		});
		antiSpam.invalidateConfig(interaction.guild.id);

		return replyEphemeral(
			interaction,
			enabled
				? 'A proteção contra spam e flood foi ativada.'
				: 'A proteção contra spam e flood foi desativada.'
		);
	},
};