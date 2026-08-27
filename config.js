const fs = require('fs');

let localConfig = {};

if (fs.existsSync('./config.json')) {
    localConfig = require('./config.json');
}

module.exports = {
    token: process.env.DISCORD_TOKEN || localConfig.token,

    clientId: process.env.DISCORD_CLIENT_ID || localConfig.clientId,

    guildId: process.env.DISCORD_GUILD_ID || localConfig.guildId,

    foundry: {
        projectEndpoint:
            process.env.FOUNDRY_PROJECT_ENDPOINT ||
            localConfig.foundry?.projectEndpoint,

        agentName:
            process.env.FOUNDRY_AGENT_NAME ||
            localConfig.foundry?.agentName
    }
};