import type { FastifyRequest, FastifyReply } from 'fastify';
import { CategoryModel } from '../models/Category';
import { ContentModel } from '../models/Content';
import { EpisodeModel } from '../models/Episode';
import { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '../../uploads');

export const listCategories = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const query = request.query as {
      page?: string;
      limit?: string;
      admin?: string;
    };
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const isAdminView = query.admin === 'true';

    const filter: any = isAdminView ? {} : { active: true };

    const [categories, total] = await Promise.all([
      CategoryModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CategoryModel.countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: categories.map((category: any) => ({
        id: category._id,
        name: category.name,
        description: category.description,
        active: category.active,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const getCategoryById = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { categoryId } = request.params as { categoryId: string };
    const category = await CategoryModel.findById(categoryId).lean();

    if (!category) {
      return reply.status(404).send({ success: false, error: 'Category not found' });
    }

    return reply.send({
      success: true,
      data: {
        id: category._id,
        name: category.name,
        description: category.description,
        active: category.active,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const createCategory = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as {
      name: string;
      description?: string;
      active?: boolean;
    };

    if (!body.name) {
      return reply.status(400).send({ success: false, error: 'Name is required' });
    }

    const category = await CategoryModel.create({
      name: body.name,
      description: body.description,
      active: body.active !== undefined ? body.active : true,
    });

    return reply.status(201).send({
      success: true,
      data: {
        id: category._id,
        name: category.name,
        description: category.description,
        active: category.active,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const updateCategory = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { categoryId } = request.params as { categoryId: string };
    const body = request.body as {
      name?: string;
      description?: string;
      active?: boolean;
    };

    const category = await CategoryModel.findByIdAndUpdate(
      categoryId,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!category) {
      return reply.status(404).send({ success: false, error: 'Category not found' });
    }

    return reply.send({
      success: true,
      data: {
        id: category._id,
        name: category.name,
        description: category.description,
        active: category.active,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const deleteCategory = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { categoryId } = request.params as { categoryId: string };
    const category = await CategoryModel.findByIdAndDelete(categoryId);

    if (!category) {
      return reply.status(404).send({ success: false, error: 'Category not found' });
    }

    return reply.send({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const bulkDeleteCategories = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { ids } = request.body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ success: false, error: 'Invalid or empty ids array' });
    }

    const result = await CategoryModel.deleteMany({ _id: { $in: ids } });

    return reply.send({
      success: true,
      message: `${result.deletedCount} categories deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

// Utility functions needed by contentController
export const parseList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const parseBool = (value: unknown, fallback = false): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === '1' || value === 'yes';
};

export const parsePositiveNumber = (value: unknown, fallback?: number): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const ensureDefaultImage = () => {
  const folder = path.join(uploadsRoot, 'thumbnails');
  const fileName = 'default-thumbnail.svg';
  const filePath = path.join(folder, fileName);
  ensureDir(folder);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#0b1217"/>
  <rect x="64" y="64" width="1152" height="592" rx="28" fill="#141d23" stroke="#2a343c" stroke-width="4"/>
  <circle cx="640" cy="360" r="92" fill="#e50914"/>
  <path d="M615 312v96l84-48z" fill="#fff"/>
  <text x="640" y="515" text-anchor="middle" fill="#d7dde2" font-family="Arial, sans-serif" font-size="42" font-weight="700">Video Upload</text>
</svg>`
    );
  }

  return `/uploads/thumbnails/${fileName}`;
};

const deleteOldFile = (filePath?: string) => {
  if (!filePath || !filePath.startsWith('/uploads/')) return;
  const fullPath = path.join(__dirname, '../..', filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

const saveUploadedFile = async (part: any, folder: string): Promise<string> => {
  ensureDir(path.join(uploadsRoot, folder));
  const uniqueName = `${Date.now()}-${(part.filename || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(uploadsRoot, folder, uniqueName);

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    part.file.pipe(writeStream);
    writeStream.on('finish', () => resolve(`/uploads/${folder}/${uniqueName}`));
    writeStream.on('error', reject);
  });
};

export const toLocalUploadPath = (fileUrl: string): string | undefined => {
  if (!fileUrl.startsWith('/uploads/')) return undefined;
  return path.join(__dirname, '../..', fileUrl);
};

const runCommand = (command: string, args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
      }
    });
  });
};

export const getVideoDurationSeconds = async (filePath: string): Promise<number | undefined> => {
  try {
    const output = await runCommand('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    const duration = Number(output);
    return Number.isFinite(duration) && duration > 0 ? duration : undefined;
  } catch (error) {
    console.warn('ffprobe unavailable or failed:', error);
    return undefined;
  }
};

export const mapContent = (content: any, episodeCount = 0) => ({
  id: content._id.toString(),
  title: content.title,
  subtitle: content.shortDescription,
  description: content.description,
  thumbnail: content.thumbnail,
  bannerImage: content.bannerImage,
  genres: content.genres,
  languages: content.languages,
  views: content.views,
  likes: content.likes,
  shares: content.shares,
  episodeCount,
  status: content.status,
  createdAt: content.createdAt,
  updatedAt: content.updatedAt,
});

export const mapCategory = (category: any) => ({
  id: category._id.toString(),
  name: category.name,
  description: category.description,
  active: category.active !== undefined ? category.active : true,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

export const mapEpisode = (episode: any) => ({
  id: episode._id.toString(),
  contentId: episode.contentId.toString(),
  episode: episode.episode,
  season: episode.season,
  title: episode.title,
  heading: episode.heading,
  description: episode.description,
  thumbnail: episode.thumbnail,
  hlsUrl: episode.hlsUrl,
  sourceVideoUrl: episode.sourceVideoUrl,
  sourceStartSeconds: episode.sourceStartSeconds,
  sourceEndSeconds: episode.sourceEndSeconds,
  duration: episode.duration,
  views: episode.views,
  isFree: episode.isFree,
  isLocked: episode.isLocked,
  categories: episode.categories ? episode.categories.map(mapCategory) : [],
  processingStatus: episode.processingStatus,
  processingError: episode.processingError,
});

const processEpisodeHls = async (episodeId: Types.ObjectId, sourceVideoUrl: string) => {
  try {
    const episode = await EpisodeModel.findById(episodeId).lean();
    if (!episode) return;

    const sourceVideoPath = toLocalUploadPath(sourceVideoUrl);
    if (!sourceVideoPath || !fs.existsSync(sourceVideoPath)) {
      await EpisodeModel.findByIdAndUpdate(episodeId, {
        processingStatus: 'failed',
        processingError: 'Source video not found',
      });
      return;
    }

    const hlsFolder = path.join(uploadsRoot, 'hls', episode.contentId.toString());
    ensureDir(hlsFolder);

    const outputPattern = path.join(hlsFolder, `episode_${episode.episode}`, 'segment_%03d.ts');
    const playlistPath = path.join(hlsFolder, `episode_${episode.episode}`, 'playlist.m3u8');
    ensureDir(path.dirname(outputPattern));

    await runCommand('ffmpeg', [
      '-i',
      sourceVideoPath,
      '-ss',
      episode.sourceStartSeconds.toString(),
      '-t',
      (episode.sourceEndSeconds - episode.sourceStartSeconds).toString(),
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-f',
      'hls',
      '-hls_time',
      '10',
      '-hls_list_size',
      '0',
      outputPattern,
    ]);

    await EpisodeModel.findByIdAndUpdate(episodeId, {
      hlsUrl: `/uploads/hls/${episode.contentId.toString()}/episode_${episode.episode}/playlist.m3u8`,
      processingStatus: 'completed',
    });
  } catch (error: any) {
    console.error('Error processing episode HLS:', error);
    await EpisodeModel.findByIdAndUpdate(episodeId, {
      processingStatus: 'failed',
      processingError: error.message,
    });
  }
};

export const processEpisodesInBackground = (episodeIds: Types.ObjectId[], sourceVideoUrl: string) => {
  setImmediate(async () => {
    for (const episodeId of episodeIds) {
      await processEpisodeHls(episodeId, sourceVideoUrl);
    }
  });
};

export const createEpisodeSlices = async ({
  contentId,
  sourceVideoUrl,
  sourceVideoPath,
  reelDurationMinutes = 3,
  totalDurationMinutes,
  freeEpisodeCount,
  lockEpisodes = true,
}: {
  contentId: Types.ObjectId;
  sourceVideoUrl: string;
  sourceVideoPath: string;
  reelDurationMinutes?: number;
  totalDurationMinutes?: number;
  freeEpisodeCount?: number;
  lockEpisodes?: boolean;
}) => {
  const duration = totalDurationMinutes
    ? totalDurationMinutes * 60
    : (await getVideoDurationSeconds(sourceVideoPath)) || reelDurationMinutes * 60;

  const episodeCount = Math.floor(duration / (reelDurationMinutes * 60));
  const episodes = [];

  for (let i = 0; i < episodeCount; i++) {
    const start = i * reelDurationMinutes * 60;
    const end = Math.min(start + reelDurationMinutes * 60, duration);
    const isFree = freeEpisodeCount !== undefined && i < freeEpisodeCount;

    episodes.push({
      contentId,
      season: 1,
      episode: i + 1,
      title: `Episode ${i + 1}`,
      thumbnail: '',
      sourceVideoUrl,
      sourceStartSeconds: start,
      sourceEndSeconds: end,
      duration: end - start,
      hlsUrl: '',
      isFree,
      isLocked: !isFree,
      processingStatus: 'queued',
    });
  }

  const createdEpisodes = await EpisodeModel.insertMany(episodes);
  processEpisodesInBackground(
    createdEpisodes.map((episode) => episode._id as Types.ObjectId),
    sourceVideoUrl
  );

  return createdEpisodes;
};

export const readCategoryMultipart = async (request: FastifyRequest): Promise<any> => {
  const data: any = {};

  for await (const part of request.parts()) {
    if (part.type === 'field') {
      if (part.fieldname === 'title') data.title = part.value as string;
      if (part.fieldname === 'subtitle') data.subtitle = part.value as string;
      if (part.fieldname === 'description') data.description = part.value as string;
      if (part.fieldname === 'genres') data.genres = parseList(part.value);
      if (part.fieldname === 'languages') data.languages = parseList(part.value);
      if (part.fieldname === 'reelDurationMinutes') data.reelDurationMinutes = parsePositiveNumber(part.value);
      if (part.fieldname === 'totalDurationMinutes') data.totalDurationMinutes = parsePositiveNumber(part.value);
      if (part.fieldname === 'freeEpisodeCount') data.freeEpisodeCount = Number(part.value);
      if (part.fieldname === 'lockEpisodes') data.lockEpisodes = parseBool(part.value, true);
      if (part.fieldname === 'thumbnail') data.thumbnail = part.value as string;
      if (part.fieldname === 'bannerImage') data.bannerImage = part.value as string;
      if (part.fieldname === 'videoUrl') data.videoUrl = part.value as string;
      if (part.fieldname === 'categoryIds') data.categoryIds = parseList(part.value);
    } else if (part.type === 'file') {
      if (part.fieldname === 'thumbnailFile') data.thumbnail = await saveUploadedFile(part, 'thumbnails');
      if (part.fieldname === 'bannerFile') data.bannerImage = await saveUploadedFile(part, 'thumbnails');
      if (part.fieldname === 'videoFile') data.videoUrl = await saveUploadedFile(part, 'videos');
    }
  }

  return data;
};
