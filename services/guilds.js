const { getGuildsCollection } = require('./database');

const guilds = getGuildsCollection();

async function get(guildId) {
    const snapshot = await guilds.doc(guildId).get();

    if (!snapshot.exists) {
        return null;
    }

    return snapshot.data();
}

async function update(guildId, data) {
    await guilds.doc(guildId).set(data, {
        merge: true,
    });
}

async function remove(guildId) {
    await guilds.doc(guildId).delete();
}

module.exports = {
    get,
    update,
    remove,
};