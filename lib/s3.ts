import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// ── Runtime config validation ────────────────────────────────────────────────
const ENDPOINT = process.env.HETZNER_S3_ENDPOINT;
const ACCESS_KEY = process.env.HETZNER_ACCESS_KEY;
const SECRET_KEY = process.env.HETZNER_SECRET_KEY;
const BUCKET = process.env.HETZNER_BUCKET_NAME;
const BASE_URL = process.env.HETZNER_S3_PUBLIC_BASE_URL;

function getClient(): S3Client {
  if (!ENDPOINT || !ACCESS_KEY || !SECRET_KEY || !BUCKET || !BASE_URL) {
    throw new Error(
      "Hetzner S3 is not configured. Missing one or more required environment variables: " +
        "HETZNER_S3_ENDPOINT, HETZNER_ACCESS_KEY, HETZNER_SECRET_KEY, HETZNER_BUCKET_NAME, HETZNER_S3_PUBLIC_BASE_URL"
    );
  }

  return new S3Client({
    region: "hel1",
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
    forcePathStyle: true, // REQUIRED for Hetzner Object Storage
  });
}

/**
 * Upload a Buffer directly to Hetzner S3 and return the full public URL.
 *
 * @param buffer      - File content as a Buffer.
 * @param key         - Unique S3 key, e.g. "site-photos/1234-abc.webp"
 * @param contentType - MIME type, e.g. "image/webp"
 * @returns           The full public URL of the uploaded object.
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  return `${BASE_URL}/${key}`;
}

/**
 * Delete a file from Hetzner S3 by its full public URL.
 * Gracefully ignores errors (file may already be gone).
 *
 * @param publicUrl - The full public URL returned from uploadBufferToS3.
 */
export async function deleteFileFromS3(publicUrl: string): Promise<void> {
  try {
    const client = getClient();
    // Extract key from URL: "https://maptailer.hel1.your-objectstorage.com/site-photos/abc.webp" → "site-photos/abc.webp"
    const key = new URL(publicUrl).pathname.replace(/^\//, "");
    await client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET!,
        Key: key,
      })
    );
    console.log(`[S3] Deleted: ${key}`);
  } catch (err) {
    // Log but do not throw — a failed delete should never block the UI
    console.error(`[S3] Failed to delete ${publicUrl}:`, err);
  }
}
