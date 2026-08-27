const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

async function connect() {
    await db.collection('test').doc('connection').set({
        connected: true,
        timestamp: new Date(),
    });

    console.log('Firebase conectado!');
}

function getGuildsCollection() {
    return db.collection('guilds');
}

function getMembersCollection() {
    return db.collection('members');
}

module.exports = {
    db,
    connect,
    getGuildsCollection,
    getMembersCollection,
};