const MAX_FILE_BYTES = 8 * 1024 * 1024;

function safeFileName(name) {
    const fileName = String(name || 'arquivo.txt')
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .replace(/^[.-]+/, '')
        .slice(0, 100);

    return fileName || 'arquivo.txt';
}

function parseAiReply(output) {
    const text = String(output || '').trim();

    if (!text) {
        return { content: 'Não consegui pensar em uma resposta.', files: [] };
    }

    try {
        const payload = JSON.parse(text);
        const file = payload?.arquivo;
        const fileContent = file?.conteudo;

        if (
            typeof fileContent === 'string' &&
            Buffer.byteLength(fileContent, 'utf8') <= MAX_FILE_BYTES
        ) {
            return {
                content: String(payload.mensagem || payload.resposta || 'Arquivo gerado.').trim(),
                files: [{
                    attachment: Buffer.from(fileContent, 'utf8'),
                    name: safeFileName(file.nome)
                }]
            };
        }
    } catch {
        // Respostas normais do agente não precisam ser JSON.
    }

    return { content: text, files: [] };
}

module.exports = {
    parseAiReply
};