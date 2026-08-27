const { AIProjectClient } = require('@azure/ai-projects');
const { ClientSecretCredential } = require('@azure/identity');

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

async function chat(userId, message) {
    let conversationId = conversations.get(userId);

    if (!conversationId) {
        const conversation = await openai.conversations.create();

        conversationId = conversation.id;
        conversations.set(userId, conversationId);
    }

    const response = await openai.responses.create(
        {
            conversation: conversationId,
            input: message,
        },
        {
            body: {
                agent_reference: {
                    name: process.env.FOUNDRY_AGENT_NAME,
                    type: 'agent_reference'
                }
            },
            headers: {
                'x-memory-user-id': userId
            }
        }
    );

    return response.output_text;
}

module.exports = {
    chat
};