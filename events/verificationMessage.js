const { Events } = require('discord.js');

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const VERIFY_ROLE_ID = process.env.VERIFY_ROLE_ID;

const NEEDED_MESSAGES = 15;
const TTL_MS = 48 * 60 * 60 * 1000;

const state = new Map();

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        if (message.guild.id !== GUILD_ID) return;

        const member = message.member;

        if (!member) return;

        if (member.roles.cache.has(VERIFY_ROLE_ID)) return;

        const role = message.guild.roles.cache.get(VERIFY_ROLE_ID);

        if (!role) {
            console.error(
                `Cargo de verificação não encontrado: ${VERIFY_ROLE_ID}`
            );
            return;
        }

        const now = Date.now();

        let memberState = state.get(member.id);

        if (!memberState) {
            memberState = {
                count: 0,
                lastSeen: now,
                done: false
            };

            state.set(member.id, memberState);
        }

        if (memberState.done) {
            memberState.lastSeen = now;
            return;
        }

        memberState.count++;
        memberState.lastSeen = now;

        if (memberState.count >= NEEDED_MESSAGES) {
            try {
                await member.roles.add(
                    role,
                    `Verificação: ${NEEDED_MESSAGES} mensagens`
                );

                memberState.done = true;
            } catch (error) {
                console.error(
                    `Erro ao verificar ${member.user.tag}:`,
                    error
                );
            }
        }
    }
};

setInterval(() => {
    const now = Date.now();

    for (const [userId, memberState] of state) {
        if (now - memberState.lastSeen > TTL_MS) {
            state.delete(userId);
        }
    }
}, 15 * 60 * 1000);