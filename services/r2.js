const {
    S3Client,
    PutObjectCommand
} = require('@aws-sdk/client-s3')

const r2 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
})

async function enviarR2({ arquivo, caminho, tipo }) {
    await r2.send(
        new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: caminho,
            Body: arquivo,
            ContentType: tipo
        })
    )

    const url = `https://cdn.murof.me/${caminho}`

    return url
}

module.exports = {
    enviarR2
}
