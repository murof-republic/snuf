const { SlashCommandBuilder } = require('discord.js');
const { requireGuild, requireInVoiceChannel, replyEphemeral } = require('../../utils/commandUtils');
const radio = require('../../services/radio');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pular')
		.setDescription('Pula a estação da rádio.'),

	async execute(interaction) {
		if (!requireGuild(interaction, process.env.DISCORD_GUILD_ID, 'Esse comando só pode ser usado no servidor da rádio.')) return;

		const currentChannelId = radio.getCurrentChannelId();
		if (!requireInVoiceChannel(interaction, currentChannelId, 'Você precisa estar em um canal de voz para usar a rádio.')) return;

		const skipped = await radio.skipSong(interaction.member.voice.channelId);

		if (!skipped) {
			return replyEphemeral(interaction, 'A rádio não está tocando no momento.');
		}

		return replyEphemeral(interaction, 'Estação pulada!');
	}
};
