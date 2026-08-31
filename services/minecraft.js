const { EmbedBuilder } = require('discord.js');
const { getGuildsCollection } = require('./firebase');

const startedAt = new Map();
const lastOnline = new Map();

async function getServerStatus(serverAddress) {
    try {
        const response = await fetch(
            `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverAddress)}`
        );

        if (!response.ok) {
            throw new Error(`mcstatus.io HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(
            `Erro ao consultar o servidor Minecraft ${serverAddress}:`,
            error
        );

        return {
            online: false
        };
    }
}

function createDashboard(data, serverAddress, guildId) {
    const online = Boolean(data?.online);

    const previousOnline = lastOnline.get(guildId) || false;

    if (online && !previousOnline) {
        startedAt.set(guildId, Date.now());
    }

    if (!online) {
        startedAt.delete(guildId);
    }

    lastOnline.set(guildId, online);

    const embed = new EmbedBuilder()
        .setTitle('Status do Servidor')
        .setDescription(
            'Painel do nosso servidor do Minecraft. ' +
            'Quer entrar? Peça para ser incluído na whitelist!'
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
            value: `\`${serverAddress}\``,
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

        const serverStartedAt = startedAt.get(guildId);

        if (serverStartedAt) {
            embed.addFields({
                name: 'Ligado desde',
                value: `<t:${Math.floor(serverStartedAt / 1000)}:F>`,
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

        if (!minecraft?.channelId || !minecraft?.server) {
            continue;
        }

        try {
            const channel = await client.channels.fetch(
                minecraft.channelId
            );

            if (!channel?.isTextBased()) {
                continue;
            }

            const data = await getServerStatus(
                minecraft.server
            );

            const embed = createDashboard(
                data,
                minecraft.server,
                doc.id
            );

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
    }, 5 * 60 * 1000);
}

module.exports = {
    getServerStatus,
    createDashboard,
    updateDashboard,
    startMinecraftDashboard
};