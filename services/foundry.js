const { AIProjectClient } = require('@azure/ai-projects');
const { ClientSecretCredential } = require('@azure/identity');
const { db } = require('./firebase');

const requiredEnv = [
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'FOUNDRY_PROJECT_ENDPOINT',
    'FOUNDRY_AGENT_NAME'
];

const missingEnvOnBoot = requiredEnv.filter(key => !process.env[key]);

if (missingEnvOnBoot.length) {
    console.warn(
        `[FOUNDRY] Desativado por variáveis ausentes: ${missingEnvOnBoot.join(', ')}`
    );
}

let openai = null;

function getOpenAIClient() {
    if (openai) return openai;

    const missingEnv = requiredEnv.filter(key => !process.env[key]);

    if (missingEnv.length) {
        throw new Error(
            `Variáveis de ambiente do Foundry ausentes: ${missingEnv.join(', ')}`
        );
    }

    const credential = new ClientSecretCredential(
        process.env.AZURE_TENANT_ID,
        process.env.AZURE_CLIENT_ID,
        process.env.AZURE_CLIENT_SECRET
    );

    const project = new AIProjectClient(
        process.env.FOUNDRY_PROJECT_ENDPOINT,
        credential
    );

    openai = project.getOpenAIClient();
    return openai;
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function buildMemoryScope(guildId, userId) {
    return `${guildId}/${userId}`
        .replace(/[^a-zA-Z0-9_.%+@/-]/g, '')
        .slice(0, 256);
}

function conversationDocument(scope) {
    return db.collection('foundryConversations').doc(scope.replaceAll('/', '_'));
}

async function loadConversationId(scope) {
    const snapshot = await conversationDocument(scope).get();
    return snapshot.exists ? snapshot.data()?.conversationId : null;
}

async function saveConversationId(scope, conversationId) {
    await conversationDocument(scope).set({
        conversationId,
        updatedAt: new Date()
    }, { merge: true });
}

function findContainerFileCitations(value, citations = []) {
    if (!value || typeof value !== 'object') return citations;

    if (value.type === 'container_file_citation') {
        citations.push(value);
    }

    for (const child of Object.values(value)) {
        findContainerFileCitations(child, citations);
    }

    return citations;
}

async function downloadGeneratedFiles(openaiClient, response) {
    if (!openaiClient.containers?.files?.content) return [];

    const citations = findContainerFileCitations(response.output);
    const files = [];

    for (const citation of citations.slice(0, 3)) {
        const contentResponse = await openaiClient.containers.files.content.retrieve(
            citation.file_id,
            { container_id: citation.container_id }
        );
        const buffer = Buffer.from(await contentResponse.arrayBuffer());

        if (buffer.length <= MAX_FILE_BYTES) {
            files.push({
                attachment: buffer,
                name: citation.filename
            });
        }
    }

    return files;
}

async function chat(userId, message, context = {}) {
    const openaiClient = getOpenAIClient();
    const content = String(message || '').trim();

    if (!content) {
        throw new Error('Mensagem vazia para o Foundry.');
    }

    const safeContent = content.slice(0, MAX_MESSAGE_LENGTH);
    const memoryScope = buildMemoryScope(
        context.servidor?.id || 'sem-servidor',
        userId
    );

    const input = JSON.stringify({
        mensagemAtual: safeContent,
        contextoAtual: context
    });

    let conversationId = await loadConversationId(memoryScope);

    if (!conversationId) {
        const conversation = await openaiClient.conversations.create();
        conversationId = conversation.id;
        await saveConversationId(memoryScope, conversationId);
    }

    const response = await openaiClient.responses.create({
        conversation: conversationId,
        input,
        agent_reference: {
            name: process.env.FOUNDRY_AGENT_NAME,
            type: 'agent_reference'
        }
    }, {
        headers: {
            'x-memory-user-id': memoryScope
        }
    });

    return {
        text: response.output_text,
        files: await downloadGeneratedFiles(openaiClient, response)
    };
}

module.exports = {
    chat
};