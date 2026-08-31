const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = {
	projectId: process.env.FIREBASE_PROJECT_ID,
	clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
	privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
};

initializeApp({
	credential: cert(serviceAccount),
});

const db = getFirestore();

async function connect() {
	await db.collection('login').doc('connection').set({
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

function getProfilesCollection() {
	return db.collection('profiles');
}

module.exports = {
	db,
	connect,
	getGuildsCollection,
	getMembersCollection,
	getProfilesCollection,
};