const { AIProjectClient } = require('@azure/ai-projects');
const { ClientSecretCredential } = require('@azure/identity');

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

const conversations = new Map();
const userMemories = new Map();
const guildMemories = new Map();
const CONVERSATION_TTL_MS = 30 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 500;
const MAX_MEMORY_ITEMS = 8;

function buildMemoryScope(guildId, userId) {
    return `${guildId}/${userId}`
        .replace(/[^a-zA-Z0-9_.%+@/-]/g, '')
        .slice(0, 256);
}

function remember(memoryStore, key, item) {
    const memory = memoryStore.get(key) || [];
    memory.push(item);
    memoryStore.set(key, memory.slice(-MAX_MEMORY_ITEMS));
}

function pruneExpiredConversations(now = Date.now()) {
    for (const [userId, metadata] of conversations.entries()) {
        if (now - metadata.lastUsed > CONVERSATION_TTL_MS) {
            conversations.delete(userId);
            userMemories.delete(userId);
        }
    }
}

async function chat(userId, message, context = {}) {
    const openaiClient = getOpenAIClient();
    const content = String(message || '').trim();

    if (!content) {
        throw new Error('Mensagem vazia para o Foundry.');
    }

    const safeContent = content.slice(0, MAX_MESSAGE_LENGTH);
    const now = Date.now();

    pruneExpiredConversations(now);

    const guildId = context.servidor?.id || 'sem-servidor';
    const conversationKey = buildMemoryScope(guildId, userId);

    remember(userMemories, conversationKey, `Usuário disse: ${safeContent}`);
    remember(
        guildMemories,
        guildId,
        `${context.pessoa?.nome || userId} interagiu em ${context.localizacao?.canal || 'um canal'}`
    );

    const input = JSON.stringify({
        mensagemAtual: safeContent,
        contextoAtual: context,
        memoria: {
            usuario: userMemories.get(conversationKey) || [],
            servidor: guildMemories.get(guildId) || []
        }
    });

    let conversationId = conversations.get(conversationKey)?.id;

    if (!conversationId) {
        const conversation = await openaiClient.conversations.create();

        conversationId = conversation.id;
        conversations.set(conversationKey, { id: conversationId, lastUsed: now });
    } else {
        conversations.set(conversationKey, { id: conversationId, lastUsed: now });
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
            'x-memory-user-id': conversationKey
        }
    });

    return response.output_text;
}

module.exports = {
    chat
};