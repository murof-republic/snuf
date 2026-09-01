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
		`[FIREBASE] Variáveis ausentes: ${missingEnv.join(', ')}`
	);
}

const serviceAccount = {
	projectId: process.env.FIREBASE_PROJECT_ID,
	clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
	privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
};

try {
	initializeApp({
		credential: cert(serviceAccount),
	});
	console.log('[FIREBASE] Inicializado com sucesso');
} catch (error) {
	console.error('[FIREBASE] Erro ao inicializar:', error.message);
	throw error;
}

const db = getFirestore();

async function connect() {
	try {
		await db.collection('login').doc('connection').set({
			connected: true,
			timestamp: new Date(),
		});

		console.log('[FIREBASE] Conectado!');
		return true;

	} catch (error) {
		console.error('[FIREBASE] Erro na conexão:', error.message);
		return false;
	}
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