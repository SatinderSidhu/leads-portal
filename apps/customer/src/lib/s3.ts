import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import path from "path";

let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!cachedClient) {
    const region = process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1";
    cachedClient = new S3Client({ region });
  }
  return cachedClient;
}

export function getBucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET env var not set");
  return bucket;
}

export function buildDocumentKey(leadId: string, fileName: string): string {
  const ext = path.extname(fileName);
  const safeBase = path
    .basename(fileName, ext)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  const id = randomUUID();
  return `leads/${leadId}/${id}-${safeBase}${ext}`;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  contentLength: number,
  expiresIn = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn });
}

export async function getPresignedDownloadUrl(
  key: string,
  fileName: string,
  expiresIn = 300,
  disposition: "attachment" | "inline" = "attachment"
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ResponseContentDisposition: `${disposition}; filename="${encodeURIComponent(fileName)}"`,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn });
}

export async function deleteS3Object(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getBucketName(), Key: key })
  );
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

const ALLOWED_NDA_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function isAllowedNdaMimeType(mimeType: string): boolean {
  return ALLOWED_NDA_MIME_TYPES.has(mimeType);
}
