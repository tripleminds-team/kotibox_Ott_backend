import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { FastifyRequest } from 'fastify';
import { MediaFileModel } from '../models/MediaFile';
import { Types } from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directory
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

// Define allowed file types with their allowed extensions and directories
export const UPLOAD_TYPES = {
  IMAGE: {
    name: 'image',
    allowedExts: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
    defaultDir: ''
  },
  VIDEO: {
    name: 'video',
    allowedExts: ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv'],
    defaultDir: 'videos'
  },
  DOCUMENT: {
    name: 'document',
    allowedExts: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
    defaultDir: 'documents'
  },
  CATEGORY_THUMBNAIL: {
    name: 'category-thumbnail',
    allowedExts: ['.jpg', '.jpeg', '.png', '.webp'],
    defaultDir: 'categories'
  },
  CATEGORY_BANNER: {
    name: 'category-banner',
    allowedExts: ['.jpg', '.jpeg', '.png', '.webp'],
    defaultDir: 'categories'
  },
  CATEGORY_ICON: {
    name: 'category-icon',
    allowedExts: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
    defaultDir: 'categories'
  },
  GENRE: {
    name: 'genre',
    allowedExts: ['.jpg', '.jpeg', '.png', '.webp'],
    defaultDir: 'genres'
  },
  ACTOR: {
    name: 'actor',
    allowedExts: ['.jpg', '.jpeg', '.png', '.webp'],
    defaultDir: 'actors'
  },
  DIRECTOR: {
    name: 'director',
    allowedExts: ['.jpg', '.jpeg', '.png', '.webp'],
    defaultDir: 'directors'
  },
  LANGUAGE: {
    name: 'language',
    allowedExts: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
    defaultDir: 'languages'
  },
  MEDIA_LIBRARY: {
    name: 'media-library',
    allowedExts: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mov'],
    defaultDir: 'media'
  },
  BANNER: {
    name: 'banner',
    allowedExts: ['.jpg', '.jpeg', '.png', '.webp'],
    defaultDir: 'banners'
  },
  PROMOTION: {
    name: 'promotion',
    allowedExts: ['.jpg', '.jpeg', '.png', '.webp'],
    defaultDir: 'promotions'
  }
} as const;

export type UploadType = keyof typeof UPLOAD_TYPES;

export interface UploadedFileInfo {
  originalName: string;
  fileName: string;
  filePath: string; // path with /uploads/ prefix, e.g. /uploads/categories/xxx.jpg
  url: string; // full URL, e.g. http://localhost:3000/uploads/categories/xxx.jpg
  fileSize: number; // in bytes
  mimeType: string;
  uploadType: UploadType;
  storageType?: 'local' | 's3';
}

// Ensure upload directory exists
export const ensureUploadDir = (dirPath: string) => {
  const fullPath = path.join(UPLOADS_ROOT, dirPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
};

// Generate a unique filename
export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const ext = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${timestamp}-${randomString}${baseName ? `-${baseName}` : ''}${ext}`;
};

// Validate file type
export const validateFileType = (fileName: string, uploadType: UploadType): boolean => {
  const typeConfig = UPLOAD_TYPES[uploadType];
  const ext = path.extname(fileName).toLowerCase();
  return (typeConfig.allowedExts as readonly string[]).includes(ext);
};

// Save a single file part from Fastify request
export const saveFileFromPart = async (
  part: any,
  request: FastifyRequest,
  uploadType: UploadType,
  customDir?: string,
  options?: {
    trackInMediaLibrary?: boolean;
    source?: string;
    sourceId?: string;
    folderId?: string;
  }
): Promise<UploadedFileInfo> => {
  const typeConfig = UPLOAD_TYPES[uploadType];
  const targetDir = customDir || typeConfig.defaultDir;

  // Ensure directory exists
  ensureUploadDir(targetDir);

  // Validate file type
  if (!validateFileType(part.filename, uploadType)) {
    throw new Error(
      `Invalid file type for ${typeConfig.name}. Allowed types: ${typeConfig.allowedExts.join(', ')}`
    );
  }

  // Generate unique filename
  const fileName = generateUniqueFileName(part.filename);
  const relativeFilePath = path.join(targetDir, fileName);
  const fullFilePath = path.join(UPLOADS_ROOT, relativeFilePath);

  // Save file to disk
  return new Promise(async (resolve, reject) => {
    const writeStream = fs.createWriteStream(fullFilePath);
    part.file.pipe(writeStream);

    writeStream.on('finish', async () => {
      const stats = fs.statSync(fullFilePath);
      const protocol = request.protocol;
      const host = request.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const fileInfo: UploadedFileInfo = {
        originalName: part.filename,
        fileName,
        filePath: `/uploads/${relativeFilePath.replace(/\\/g, '/')}`,
        url: `${baseUrl}/uploads/${relativeFilePath.replace(/\\/g, '/')}`,
        fileSize: stats.size,
        mimeType: part.mimetype || 'application/octet-stream',
        uploadType,
        storageType: 'local'
      };

      // Track in media library if enabled
      if (options?.trackInMediaLibrary !== false) {
        try {
          await MediaFileModel.create({
            name: part.filename,
            url: fileInfo.url,
            filePath: fileInfo.filePath,
            fileSize: stats.size,
            fileType: part.mimetype || 'application/octet-stream',
            folder: options?.folderId ? new Types.ObjectId(options.folderId) : undefined,
            source: options?.source || uploadType.toLowerCase(),
            sourceId: options?.sourceId ? new Types.ObjectId(options.sourceId) : undefined,
            storageType: 'local'
          });
        } catch (error) {
          // Log error but don't fail the upload
          console.error('Failed to track file in media library:', error);
        }
      }

      resolve(fileInfo);
    });

    writeStream.on('error', reject);
  });
};

// Delete a file from disk
export const deleteUploadedFile = (relativeFilePath: string) => {
  if (!relativeFilePath) return;
  
  const fullPath = path.join(UPLOADS_ROOT, relativeFilePath.replace(/^\/*uploads\//, '').replace(/^\/+/, ''));
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

// Get file size in human-readable format
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default {
  UPLOAD_TYPES,
  ensureUploadDir,
  generateUniqueFileName,
  validateFileType,
  saveFileFromPart,
  deleteUploadedFile,
  formatFileSize
};
