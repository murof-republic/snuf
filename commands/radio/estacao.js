const { SlashCommandBuilder } = require('discord.js');
const { requireGuild, requireInVoiceChannel, replyEphemeral } = require('../../utils/commandUtils');
const radio = require('../../services/radio');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('estação')
		.setDescription('Escolhe uma estação específica da rádio.')
		.addStringOption(option =>
			option
				.setName('estacao')
				.setDescription('Escolha a estação.')
				.setRequired(true)
				.addChoices(
					...radio.getRadios().map(station => ({
						name: station.name,
						value: station.name
					}))
				)
		),

	async execute(interaction) {
		if (!requireGuild(interaction, process.env.DISCORD_GUILD_ID, 'Esse comando só pode ser usado no servidor da rádio.')) return;

		const currentChannelId = radio.getCurrentChannelId();
		if (!requireInVoiceChannel(interaction, currentChannelId, 'Você precisa estar em um canal de voz para usar a rádio.')) return;

		const station = interaction.options.getString('estacao', true);
		const success = await radio.setRadio(station, interaction.member.voice.channelId);

		if (!success) {
			return replyEphemeral(interaction, 'Não consegui mudar para essa estação.');
		}

		return replyEphemeral(interaction, `Estação alterada para **${station}**!`);
	}
};
