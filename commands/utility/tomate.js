// comando slash 'tomate' - requer discord.js v14
// Esse comando foi gerado pelo proprio snuf
// https://discord.com/channels/1526283360144588900/1526283361084244031/1542857908726010016
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tomate')
    .setDescription('Atira um tomate a alguém.')
    .addUserOption(opt => opt.setName('alvo').setDescription('Quem vai levar o tomate.').setRequired(true)),
  async execute(interaction) {
    const alvo = interaction.options.getUser('alvo');
    await interaction.reply(`${interaction.user} atirou um 🍅 em ${alvo}!`);
  },
};