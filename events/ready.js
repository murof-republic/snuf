const { Events, ActivityType } = require('discord.js');
const { startMinecraftDashboard } = require('../services/minecraft');

const texts = [
	'Quer trocar a cor do seu nick? Experimente /cor...',
	':(failure(: - Lil Yachty',
	'IVE OFFICIALLY LOST ViSiON!!!! - Lil Yachty',
	'Flutter is an open source framework developed and supported by Google',
	'SUPER TUESDAY! - JPEGMAFIA',
	'can i have nitrus today',
	'gritos de desespero',
	'I WANT TO LIVE MY LIFE AGAIN',
	'O Linux é uma alternativa confiável ao Windows e macOS.',
	'I LOVE YOU LIKE KANYE LOVES NITROUS',
	'Entre no nosso servidor do mine! - mc.murof.me',
	'Access now! https://www.murof.me/',
	'Access now! https://discord.gg/MWrYrytMCg'
];

let index = 0;

module.exports = {
	name: Events.ClientReady,
	once: true,

	execute(client) {
		console.log(`Pronto! Conectado como ${client.user.tag}`);

		const updatePresence = () => {
			const text = texts[index % texts.length];
			index++;

			client.user.setPresence({
				status: 'online',
				activities: [
					{
						name: text,
						type: ActivityType.Listening
					}
				]
			});
		};

		updatePresence();

		setInterval(updatePresence, 60 * 60 * 1000);

		startMinecraftDashboard(client);
	}
};