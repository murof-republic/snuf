const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const requiredEnv = [
	'FIREBASE_PROJECT_ID',
	'FIREBASE_CLIENT_EMAIL',
	'FIREBASE_PRIVATE_KEY'
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length) {
	throw new Error(
		`Variáveis de ambiente do Firebase ausentes: ${missingEnv.join(', ')}`
	);
}

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

	console.log('[FIREBASE] Conectado!');
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