/** File storage (an S3-compatible bucket, Cloudflare R2 in production). Files go in with a key and come back with a link. */
const config = require('./config');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function parseR2Config() {
  const raw = config.s3Api;
  if (!raw) return null;
  const lastSlash = raw.lastIndexOf('/');
  const endpoint = raw.slice(0, lastSlash);
  const bucket = raw.slice(lastSlash + 1);
  const accessKeyId = config.r2AccessKeyId;
  const secretAccessKey = config.r2SecretAccessKey;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

let s3Client = null;
function getS3Client() {
  const cfg = parseR2Config();
  if (!cfg) return null;
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: cfg.endpoint,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }
  return s3Client;
}

/** A link to a stored file: the public address when one is configured, otherwise a signed link that lasts 30 days. Null when it cannot be made. */
async function objectUrl(bucket, key) {
  const base = config.r2PublicUrl;
  if (base) return `${base.replace(/\/$/, '')}/${key}`;
  const client = getS3Client();
  if (!client) return null;
  try {
    return await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 30 * 24 * 3600 });
  } catch {
    return null;
  }
}

const isConfigured = () => Boolean(parseR2Config() && getS3Client());

/** Store a file in the configured bucket and return its key and a link. Throws when file storage is not set up. */
async function putObject({ key, body, contentType }) {
  const cfg = parseR2Config();
  const client = getS3Client();
  if (!cfg || !client) throw new Error('File storage is not configured');
  await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentType }));
  return { key, url: await objectUrl(cfg.bucket, key) };
}

module.exports = { putObject, isConfigured };
