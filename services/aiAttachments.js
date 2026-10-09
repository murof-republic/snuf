const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set([
    'txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'xml', 'yml', 'yaml'
]);

function isTextAttachment(attachment) {
    const extension = attachment.name?.split('.').pop()?.toLowerCase();
    return Boolean(extension && TEXT_EXTENSIONS.has(extension));
}

async function collectTextAttachments(attachments) {
    const collected = [];

    for (const attachment of attachments.values()) {
        const base = {
            nome: attachment.name,
            tipo: attachment.contentType || 'application/octet-stream',
            tamanho: attachment.size,
            url: attachment.url
        };

        if (!isTextAttachment(attachment) || attachment.size > MAX_ATTACHMENT_BYTES) {
            collected.push(base);
            continue;
        }

        try {
            const response = await fetch(attachment.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const content = await response.text();
            collected.push({ ...base, conteudo: content });
        } catch (error) {
            collected.push({
                ...base,
                erro: `Não foi possível ler o anexo: ${error.message}`
            });
        }
    }

    return collected;
}

module.exports = {
    collectTextAttachments
};