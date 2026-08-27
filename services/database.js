const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let serviceAccount;

if (process.env.FIREBASE_PROJECT_ID) {
	serviceAccount = {
		projectId: process.env.FIREBASE_PROJECT_ID,
		clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
		privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
	};
} else {
	serviceAccount = require('../serviceAccountKey.json');
}

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