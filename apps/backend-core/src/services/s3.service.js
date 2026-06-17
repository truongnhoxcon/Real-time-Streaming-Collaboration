const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
require('dotenv').config();

const hasAwsCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
const hasContainerCredentials = !!(process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI);

// Fallback to mock URL if no AWS access keys are found and we are not in an AWS container environment
const useMockS3 = !hasAwsCredentials && !hasContainerCredentials;

let s3Client = null;
if (!useMockS3) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
  });
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'realtime-collab-files-default';

/**
 * Generate a presigned PUT URL for uploading a file directly to S3.
 * Key format: server-{serverId}/channels/{channelId}/{uuid}-{filename}
 * 
 * @param {string} serverId
 * @param {string} channelId
 * @param {string} filename
 * @param {string} contentType
 * @returns {Promise<{ uploadUrl: string, key: string }>}
 */
async function getUploadPresignedUrl(serverId, channelId, filename, contentType) {
  const fileUuid = crypto.randomUUID();
  // Sanitize filename to avoid folder injection
  const sanitizedFilename = encodeURIComponent(filename.replace(/\s+/g, '_'));
  const key = `server-${serverId}/channels/${channelId}/${fileUuid}-${sanitizedFilename}`;

  if (useMockS3) {
    const mockUrl = `http://localhost:3000/mock-s3-local/${key}`;
    console.log(`[MOCK S3] Generating mock upload URL for key: ${key}`);
    return {
      uploadUrl: mockUrl,
      key,
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // URL valid for 15 minutes (900 seconds)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return {
      uploadUrl,
      key,
    };
  } catch (error) {
    console.error(`[MOCK S3] Credentials check or S3 signing failed (${error.message}). Falling back to local mock URL.`);
    const mockUrl = `http://localhost:3000/mock-s3-local/${key}`;
    return {
      uploadUrl: mockUrl,
      key,
    };
  }
}

/**
 * Generate a presigned GET URL for downloading/viewing a file from S3.
 * 
 * @param {string} key - The S3 object key
 * @returns {Promise<string>} - Presigned URL
 */
async function getDownloadPresignedUrl(key) {
  if (useMockS3) {
    const mockUrl = `http://localhost:3000/mock-s3-local/${key}`;
    console.log(`[MOCK S3] Generating mock download URL for key: ${key}`);
    return mockUrl;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // URL valid for 1 hour (3600 seconds)
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return downloadUrl;
  } catch (error) {
    console.error(`[MOCK S3] Credentials check or S3 signing failed (${error.message}). Falling back to local mock URL.`);
    const mockUrl = `http://localhost:3000/mock-s3-local/${key}`;
    return mockUrl;
  }
}

module.exports = {
  getUploadPresignedUrl,
  getDownloadPresignedUrl,
};

