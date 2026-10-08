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

const MAX_MESSAGE_LENGTH = 500;

function buildMemoryScope(guildId, userId) {
    return `${guildId}/${userId}`
        .replace(/[^a-zA-Z0-9_.%+@/-]/g, '')
        .slice(0, 256);
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

    const conversation = await openaiClient.conversations.create();

    const response = await openaiClient.responses.create({
        conversation: conversation.id,
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

    return response.output_text;
}

module.exports = {
    chat
};