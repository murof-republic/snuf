const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Recarrega um comando.')
		.addStringOption((option) => option.setName('command').setDescription('Comando para ser recarregado.').setRequired(true)),
	async execute(interaction) {
	    const commandName = interaction.options.getString('command', true).toLowerCase();
	    const command = interaction.client.commands.get(commandName);

		if (!command) {
			return interaction.reply(`Não existe comando com o nome \`${commandName}\`!`);
		}
        
        delete require.cache[require.resolve(`./${command.data.name}.js`)];

        try {
            const newCommand = require(`./${command.data.name}.js`);
            interaction.client.commands.set(newCommand.data.name, newCommand);
            await interaction.reply(`Comando \`${newCommand.data.name}\` foi recarregado!`);
        } catch (error) {
            console.error(error);
            await interaction.reply(
                `Ocorreu um erro ao recarregar um comando. \`${command.data.name}\`:\n\`${error.message}\``,
            );
        }
	},
};

