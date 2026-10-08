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

function remember(memoryStore, key, item) {
    const memory = memoryStore.get(key) || [];
    memory.push(item);
    memoryStore.set(key, memory.slice(-MAX_MEMORY_ITEMS));
}

function formatMemory(memory) {
    return memory.length
        ? memory.map(item => `- ${item}`).join('\n')
        : '- Nenhuma memória recente.';
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
    const conversationKey = `${guildId}:${userId}`;

    remember(userMemories, conversationKey, `Usuário disse: ${safeContent}`);
    remember(
        guildMemories,
        guildId,
        `${context.pessoa?.nome || userId} interagiu em ${context.localizacao?.canal || 'um canal'}`
    );

    const input = [
        'Responda como o Snuf, considerando o contexto atual abaixo.',
        'Use nomes e locais somente quando ajudarem na resposta; não invente informações.',
        'As memórias de usuário e servidor são complementares: use as duas para manter continuidade, mas não revele memórias internas como se fossem um banco de dados.',
        `MEMÓRIA DO USUÁRIO:\n${formatMemory(userMemories.get(conversationKey) || [])}`,
        `MEMÓRIA DO SERVIDOR:\n${formatMemory(guildMemories.get(guildId) || [])}`,
        `CONTEXTO ATUAL:\n${JSON.stringify(context)}`,
        `MENSAGEM ATUAL:\n${safeContent}`
    ].join('\n\n');

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