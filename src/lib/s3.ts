import { logger } from './logger';

export interface PresignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export async function generatePresignedUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<PresignedUrlResult> {
  // Always return mock URL for local dev
  return {
    uploadUrl: `https://mock-storage.local/upload/${key}?token=dev-placeholder`,
    publicUrl: `https://mock-storage.local/${key}`,
    key,
  };
}
