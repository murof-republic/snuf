const { AIProjectClient } = require('@azure/ai-projects');
const { ClientSecretCredential } = require('@azure/identity');

const requiredEnv = [
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'FOUNDRY_PROJECT_ENDPOINT',
    'FOUNDRY_AGENT_NAME'
];

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

const openai = project.getOpenAIClient();

const conversations = new Map();
const CONVERSATION_TTL_MS = 30 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 500;

function pruneExpiredConversations(now = Date.now()) {
    for (const [userId, metadata] of conversations.entries()) {
        if (now - metadata.lastUsed > CONVERSATION_TTL_MS) {
            conversations.delete(userId);
        }
    }
}

async function chat(userId, message) {
    const content = String(message || '').trim();

    if (!content) {
        throw new Error('Mensagem vazia para o Foundry.');
    }

    const safeContent = content.slice(0, MAX_MESSAGE_LENGTH);
    const now = Date.now();

    pruneExpiredConversations(now);

    let conversationId = conversations.get(userId)?.id;

    if (!conversationId) {
        const conversation = await openai.conversations.create();

        conversationId = conversation.id;
        conversations.set(userId, { id: conversationId, lastUsed: now });
    } else {
        conversations.set(userId, { id: conversationId, lastUsed: now });
    }

    const response = await openai.responses.create({
        conversation: conversationId,
        input: safeContent,
        agent_reference: {
            name: process.env.FOUNDRY_AGENT_NAME,
            type: 'agent_reference'
        }
    }, {
        headers: {
            'x-memory-user-id': userId
        }
    });

    return response.output_text;
}

module.exports = {
    chat
};