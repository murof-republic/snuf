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
				.setAutocomplete(true)
		),

	autocomplete: async function(interaction) {
		const focusedValue = interaction.options.getFocused().toLowerCase();
		const stations = radio.getRadios();
		const filtered = stations
			.filter(station => station.name.toLowerCase().includes(focusedValue))
			.slice(0, 25)
			.map(station => ({
				name: station.name,
				value: station.name
			}));

		await interaction.respond(filtered);
	},

	async execute(interaction) {
		if (!requireGuild(interaction, process.env.DISCORD_GUILD_ID, 'Esse comando só pode ser usado no servidor da rádio.')) return;

		const currentChannelId = radio.getCurrentChannelId(interaction.guildId);
		if (!requireInVoiceChannel(interaction, currentChannelId, 'Você precisa estar em um canal de voz para usar a rádio.')) return;

		const station = interaction.options.getString('estacao', true);
		const success = await radio.setRadio(station, interaction.guildId, interaction.member.voice.channelId);

		if (!success) {
			return replyEphemeral(interaction, 'Não consegui mudar para essa estação.');
		}

		return replyEphemeral(interaction, `Estação alterada para **${station}**!`);
	}
};
