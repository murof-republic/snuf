const { AIProjectClient } = require('@azure/ai-projects');
const { DefaultAzureCredential } = require('@azure/identity');
const config = require('../config.json');

const credential = new DefaultAzureCredential();

const project = new AIProjectClient(
	config.foundry.projectEndpoint,
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
					name: config.foundry.agentName,
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