const { EmbedBuilder } = require('discord.js');
const { getGuildsCollection } = require('./database');

const SERVER_ADDRESS = 'mc.murof.me';
const API_URL = `https://api.mcstatus.io/v2/status/java/${SERVER_ADDRESS}`;

let startedAt = null;
let lastOnline = false;

async function getServerStatus() {
	try {
		const response = await fetch(API_URL);

		if (!response.ok) {
			throw new Error(`mcstatus.io HTTP ${response.status}`);
		}

		const data = await response.json();

		return data;
	} catch (error) {
		console.error('Erro ao consultar o servidor Minecraft:', error);

		return {
			online: false
		};
	}
}

function createDashboard(data) {
	const online = Boolean(data?.online);

	if (online && !lastOnline) {
		startedAt = Date.now();
	}

	if (!online) {
		startedAt = null;
	}

	lastOnline = online;

	const embed = new EmbedBuilder()
		.setTitle('Status do Servidor')
		.setDescription(
			'Painel do nosso servidor do Minecraft. ' +
			'Quer entrar? Peça para ser incluido na whitelist!'
		)
		.setColor(online ? 0x008000 : 0xB22222);

	embed.addFields(
		{
			name: 'Status',
			value: online ? 'ONLINE' : 'OFFLINE',
			inline: true
		},
		{
			name: 'Endereço',
			value: `\`${SERVER_ADDRESS}\``,
			inline: true
		}
	);

	if (online) {
		const version = data.version || {};
		const players = data.players || {};

		const versionName =
			version.name_clean ||
			version.name_raw ||
			version.name ||
			'Desconhecida';

		const protocol = version.protocol;

		const versionText = protocol
			? `${versionName} (Proto ${protocol})`
			: versionName;

		embed.addFields({
			name: 'Versão',
			value: versionText,
			inline: true
		});

		const playersOnline = players.online || 0;
		const playersMax = players.max || 0;
		const playerList = players.list || [];

		let playersText;

		if (playerList.length > 0) {
			const names = playerList
				.map(player =>
					player.name_clean ||
					player.name_raw ||
					player.name
				)
				.filter(Boolean)
				.map(name => `• ${name}`)
				.join('\n');

			playersText =
				`**${playersOnline}/${playersMax}**\n${names}`;
		} else if (playersOnline > 0) {
			playersText =
				`**${playersOnline}/${playersMax}**\nNomes não disponíveis`;
		} else {
			playersText =
				`**0/${playersMax}**\nNinguém`;
		}

		if (playersText.length > 900) {
			playersText = playersText.slice(0, 897) + '...';
		}

		embed.addFields({
			name: 'Jogadores',
			value: playersText,
			inline: false
		});

		if (startedAt) {
			embed.addFields({
				name: 'Ligado desde',
				value: `<t:${Math.floor(startedAt / 1000)}:F>`,
				inline: false
			});
		}
	}

	embed.setFooter({
		text: 'SNUF OPERATING SYSTEMS | Painel de Monitoramento'
	});

	embed.setTimestamp();

	return embed;
}

async function updateDashboard(client) {
	const guilds = getGuildsCollection();
	const snapshot = await guilds.get();

	for (const doc of snapshot.docs) {
		const config = doc.data();

		const minecraft = config.minecraft;

		if (!minecraft?.channelId) {
			continue;
		}

		try {
			const channel = await client.channels.fetch(
				minecraft.channelId
			);

			if (!channel?.isTextBased()) {
				continue;
			}

			const data = await getServerStatus();
			const embed = createDashboard(data);

			let message = null;

			if (minecraft.messageId) {
				try {
					message = await channel.messages.fetch(
						minecraft.messageId
					);
				} catch {
					message = null;
				}
			}

			if (message) {
				await message.edit({
					embeds: [embed]
				});
			} else {
				message = await channel.send({
					embeds: [embed]
				});

				await guilds.doc(doc.id).set({
					minecraft: {
						messageId: message.id
					}
				}, {
					merge: true
				});
			}
		} catch (error) {
			console.error(
				`Erro ao atualizar dashboard da guild ${doc.id}:`,
				error
			);
		}
	}
}

function startMinecraftDashboard(client) {
	updateDashboard(client);

	setInterval(() => {
		updateDashboard(client);
	}, 30 * 1000);
}

module.exports = {
	getServerStatus,
	createDashboard,
	updateDashboard,
	startMinecraftDashboard
};