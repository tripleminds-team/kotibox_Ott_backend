import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Types } from 'mongoose';
import { MovieModel } from '../models/Movie';
import { EpisodeModel } from '../models/Episode';
import { ContentModel } from '../models/Content';
import { isS3Configured, getS3PublicUrl, uploadHlsFolderToS3, getHlsPublicBaseUrl } from '../lib/s3';
import { logger } from '../lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// All 7 quality renditions with Netflix-grade bitrate settings
// ─────────────────────────────────────────────────────────────────────────────
export const HLS_QUALITY_LADDER = [
  { name: '144p',  width: 256,  height: 144,  bitrate: '100k',  maxrate: '110k',   bufsize: '150k',   audioBitrate: '48k'  },
  { name: '240p',  width: 426,  height: 240,  bitrate: '400k',  maxrate: '428k',   bufsize: '600k',   audioBitrate: '64k'  },
  { name: '360p',  width: 640,  height: 360,  bitrate: '800k',  maxrate: '856k',   bufsize: '1200k',  audioBitrate: '96k'  },
  { name: '480p',  width: 854,  height: 480,  bitrate: '1400k', maxrate: '1498k',  bufsize: '2100k',  audioBitrate: '128k' },
  { name: '720p',  width: 1280, height: 720,  bitrate: '2800k', maxrate: '2996k',  bufsize: '4200k',  audioBitrate: '128k' },
  { name: '1080p', width: 1920, height: 1080, bitrate: '5000k', maxrate: '5350k',  bufsize: '7500k',  audioBitrate: '192k' },
  { name: '1440p', width: 2560, height: 1440, bitrate: '8000k', maxrate: '8560k',  bufsize: '12000k', audioBitrate: '192k' },
  { name: '2160p', width: 3840, height: 2160, bitrate: '16000k',maxrate: '17120k', bufsize: '24000k', audioBitrate: '192k' },
] as const;

export type QualityName = typeof HLS_QUALITY_LADDER[number]['name'];

// Bandwidth values for master.m3u8 BANDWIDTH attribute (bits/s)
const BANDWIDTH_MAP: Record<QualityName, number> = {
  '144p':  100_000,
  '240p':  400_000,
  '360p':  800_000,
  '480p':  1_400_000,
  '720p':  2_800_000,
  '1080p': 5_000_000,
  '1440p': 8_000_000,
  '2160p': 16_000_000,
};

const RESOLUTION_MAP: Record<QualityName, string> = {
  '144p':  '256x144',
  '240p':  '426x240',
  '360p':  '640x360',
  '480p':  '854x480',
  '720p':  '1280x720',
  '1080p': '1920x1080',
  '1440p': '2560x1440',
  '2160p': '3840x2160',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const runCommand = (command: string, args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
};

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const toLocalUploadPath = (urlPath: string): string | null => {
  if (!urlPath) return null;
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  let relPath = urlPath;
  if (relPath.startsWith('/uploads/')) relPath = relPath.replace('/uploads/', '');
  else if (relPath.startsWith('uploads/')) relPath = relPath.replace('uploads/', '');
  else if (relPath.startsWith('/media/')) relPath = relPath.replace('/', '');
  return path.join(uploadsRoot, relPath);
};

const getFolderSize = (folderPath: string): number => {
  try {
    if (!fs.existsSync(folderPath)) return 0;
    const walk = (dir: string): number => {
      let size = 0;
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.join(dir, f.name);
        size += f.isDirectory() ? walk(fp) : fs.statSync(fp).size;
      }
      return size;
    };
    return walk(folderPath);
  } catch { return 0; }
};

/**
 * Probe source video resolution using ffprobe.
 * Returns { width, height } or null on failure.
 */
const probeResolution = async (inputPath: string): Promise<{ width: number; height: number } | null> => {
  try {
    const output = await runCommand('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'csv=p=0',
      inputPath,
    ]);
    const parts = output.trim().split(',');
    if (parts.length >= 2) {
      const w = parseInt(parts[0], 10);
      const h = parseInt(parts[1], 10);
      if (!isNaN(w) && !isNaN(h)) return { width: w, height: h };
    }
  } catch (err) {
    logger.warn({ err }, 'ffprobe resolution detection failed — will use all qualities');
  }
  return null;
};

/**
 * Filter quality ladder to only include renditions whose height
 * does not exceed the source video's height.
 */
const filterQualitiesByResolution = (
  sourceHeight: number,
  ladder: typeof HLS_QUALITY_LADDER
) => ladder.filter((q) => q.height <= sourceHeight);

// ─────────────────────────────────────────────────────────────────────────────
// Core HLS Transcoder — Single-pass multi-variant FFmpeg
// ─────────────────────────────────────────────────────────────────────────────
export const transcodeHlsMultiResolution = async (options: {
  id: string;
  type: 'movie' | 'episode';
  sourceVideoUrl: string;
  startSeconds?: number;
  duration?: number;
  episodeNumber?: number;
  contentIdForEpisode?: string;
}) => {
  const { id, type, sourceVideoUrl, startSeconds, duration, episodeNumber, contentIdForEpisode } = options;

  // ── Resolve input path ──────────────────────────────────────────────────
  let ffmpegInput = '';
  const s3Active = await isS3Configured();

  if (s3Active) {
    ffmpegInput = await getS3PublicUrl(sourceVideoUrl);
  } else {
    const sourceVideoPath = toLocalUploadPath(sourceVideoUrl);
    if (!sourceVideoPath || !fs.existsSync(sourceVideoPath)) {
      throw new Error(`Source video not found: ${sourceVideoPath}`);
    }
    ffmpegInput = sourceVideoPath;
  }

  // ── Determine local HLS output folder ──────────────────────────────────
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  let hlsFolder = '';
  let s3Prefix = '';
  let localUrlBase = '';

  if (type === 'movie') {
    hlsFolder    = path.join(uploadsRoot, 'hls', 'movies', id);
    s3Prefix     = `hls/movies/${id}`;
    localUrlBase = `/uploads/hls/movies/${id}`;
  } else {
    hlsFolder    = path.join(uploadsRoot, 'hls', contentIdForEpisode!, `episode-${episodeNumber}`);
    s3Prefix     = `hls/series/${contentIdForEpisode}/episode-${episodeNumber}`;
    localUrlBase = `/uploads/hls/${contentIdForEpisode}/episode-${episodeNumber}`;
  }

  ensureDir(hlsFolder);

  // ── Detect source resolution & filter quality ladder ───────────────────
  const sourceRes = await probeResolution(ffmpegInput);
  const sourceHeight = sourceRes?.height ?? 2160; // assume max if detection fails
  const qualities = filterQualitiesByResolution(sourceHeight, HLS_QUALITY_LADDER);
  logger.info({ id, type, sourceHeight, qualityCount: qualities.length }, 'Starting HLS transcoding');

  // ── Build single-pass FFmpeg args ───────────────────────────────────────
  const args: string[] = ['-y'];

  // Input seek (must come before -i for fast seek)
  if (startSeconds !== undefined && startSeconds > 0) {
    args.push('-ss', String(startSeconds));
  }
  args.push('-i', ffmpegInput);
  if (duration !== undefined && duration > 0) {
    args.push('-t', String(duration));
  }

  // Build filter_complex: split video into N streams
  const n = qualities.length;
  const splitOutputs = qualities.map((_, i) => `[v${i}]`).join('');
  args.push('-filter_complex', `[0:v]split=${n}${splitOutputs}`);

  // Map each video stream with its scale filter, then audio
  qualities.forEach((q, i) => {
    args.push(
      `-map`, `[v${i}]`,
      `-filter:v:${i}`, `scale=${q.width}:${q.height}`,
      `-c:v:${i}`, 'libx264',
      `-b:v:${i}`, q.bitrate,
      `-maxrate:v:${i}`, q.maxrate,
      `-bufsize:v:${i}`, q.bufsize,
      `-preset:v:${i}`, 'veryfast',
      `-profile:v:${i}`, 'main',
      `-map`, '0:a:0',
      `-c:a:${i}`, 'aac',
      `-b:a:${i}`, q.audioBitrate,
      `-ar:a:${i}`, '48000',
    );
  });

  // var_stream_map — pairs each video track with audio track
  const streamMap = qualities.map((_, i) => `v:${i},a:${i},name:${qualities[i].name}`).join(' ');
  args.push(
    '-var_stream_map', streamMap,
    '-master_pl_name', 'master.m3u8',
    '-f', 'hls',
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-hls_flags', 'independent_segments',
    '-hls_segment_filename', path.join(hlsFolder, '%v/segment_%03d.ts'),
    path.join(hlsFolder, '%v/playlist.m3u8'),
  );

  // ── Run FFmpeg ──────────────────────────────────────────────────────────
  try {
    await runCommand('ffmpeg', args);
  } catch (err: any) {
    logger.error({ err, id, type }, 'FFmpeg single-pass failed — falling back to sequential');
    // Fallback: process each quality sequentially (avoids OOM on low-RAM EC2)
    return transcodeHlsSequential({ id, type, sourceVideoUrl, startSeconds, duration, episodeNumber, contentIdForEpisode, qualities, hlsFolder, s3Prefix, localUrlBase, ffmpegInput });
  }

  // ── Build master.m3u8 ───────────────────────────────────────────────────
  // FFmpeg creates it automatically, but we rebuild it to ensure correct paths
  const masterLines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  for (const q of qualities) {
    const bandwidth  = BANDWIDTH_MAP[q.name as QualityName];
    const resolution = RESOLUTION_MAP[q.name as QualityName];
    masterLines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution},NAME="${q.name}"`,
      `${q.name}/playlist.m3u8`,
    );
  }
  fs.writeFileSync(path.join(hlsFolder, 'master.m3u8'), masterLines.join('\n'), 'utf-8');

  // ── Upload to S3 (if configured) or keep local ─────────────────────────
  const processedQualities = await finalizeHlsOutput({
    qualities,
    hlsFolder,
    s3Active,
    s3Prefix,
    localUrlBase,
  });

  return {
    hlsUrl: processedQualities.masterUrl,
    hlsS3Prefix: s3Active ? s3Prefix : undefined,
    videoQualities: processedQualities.renditions,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Sequential fallback (one quality at a time — safer on low-RAM servers)
// ─────────────────────────────────────────────────────────────────────────────
const transcodeHlsSequential = async (opts: {
  id: string;
  type: 'movie' | 'episode';
  sourceVideoUrl: string;
  startSeconds?: number;
  duration?: number;
  episodeNumber?: number;
  contentIdForEpisode?: string;
  qualities: ReadonlyArray<typeof HLS_QUALITY_LADDER[number]>;
  hlsFolder: string;
  s3Prefix: string;
  localUrlBase: string;
  ffmpegInput: string;
}) => {
  const { startSeconds, duration, qualities, hlsFolder, s3Prefix, localUrlBase, ffmpegInput } = opts;

  for (const q of qualities) {
    const qFolder = path.join(hlsFolder, q.name);
    ensureDir(qFolder);

    const args: string[] = ['-y'];
    if (startSeconds !== undefined && startSeconds > 0) args.push('-ss', String(startSeconds));
    args.push('-i', ffmpegInput);
    if (duration !== undefined && duration > 0) args.push('-t', String(duration));

    args.push(
      '-vf',           `scale=${q.width}:${q.height}`,
      '-c:v',          'libx264',
      '-b:v',          q.bitrate,
      '-maxrate',      q.maxrate,
      '-bufsize',      q.bufsize,
      '-profile:v',    'main',
      '-preset',       'veryfast',
      '-c:a',          'aac',
      '-b:a',          q.audioBitrate,
      '-ar',           '48000',
      '-f',            'hls',
      '-hls_time',     '6',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', path.join(qFolder, 'segment_%03d.ts'),
      path.join(qFolder, 'playlist.m3u8'),
    );

    await runCommand('ffmpeg', args);
    logger.info({ quality: q.name }, 'Sequential quality encoded');
  }

  // Rebuild master.m3u8
  const masterLines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  for (const q of qualities) {
    const bandwidth  = BANDWIDTH_MAP[q.name as QualityName];
    const resolution = RESOLUTION_MAP[q.name as QualityName];
    masterLines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution},NAME="${q.name}"`,
      `${q.name}/playlist.m3u8`,
    );
  }
  fs.writeFileSync(path.join(hlsFolder, 'master.m3u8'), masterLines.join('\n'), 'utf-8');

  const s3Active = await isS3Configured();
  const out = await finalizeHlsOutput({ qualities, hlsFolder, s3Active, s3Prefix, localUrlBase });
  return {
    hlsUrl:          out.masterUrl,
    videoQualities:  out.renditions,
    hlsS3Prefix:     s3Active ? s3Prefix : undefined,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Finalize: Upload to S3 (or keep local), return URL map
// ─────────────────────────────────────────────────────────────────────────────
const finalizeHlsOutput = async (opts: {
  qualities: ReadonlyArray<typeof HLS_QUALITY_LADDER[number]>;
  hlsFolder: string;
  s3Active: boolean;
  s3Prefix: string;
  localUrlBase: string;
}) => {
  const { qualities, hlsFolder, s3Active, s3Prefix, localUrlBase } = opts;

  if (s3Active) {
    // Upload all .ts segments + .m3u8 playlists to S3
    logger.info({ s3Prefix }, 'Uploading HLS folder to S3…');
    await uploadHlsFolderToS3(hlsFolder, s3Prefix);

    const baseUrl = await getHlsPublicBaseUrl();
    const masterUrl = `${baseUrl}/${s3Prefix}/master.m3u8`;

    const renditions = qualities.map((q) => ({
      quality: q.name as QualityName,
      url:  `${baseUrl}/${s3Prefix}/${q.name}/playlist.m3u8`,
      size: getFolderSize(path.join(hlsFolder, q.name)),
    }));

    // Clean up local temp files to save disk space
    try {
      fs.rmSync(hlsFolder, { recursive: true, force: true });
      logger.info({ hlsFolder }, 'Cleaned up local HLS temp files after S3 upload');
    } catch (cleanupErr) {
      logger.warn({ cleanupErr }, 'Failed to clean up local HLS temp folder');
    }

    return { masterUrl, renditions };
  } else {
    // Local mode — serve from the uploads directory
    const masterUrl = `${localUrlBase}/master.m3u8`;
    const renditions = qualities.map((q) => ({
      quality: q.name as QualityName,
      url:  `${localUrlBase}/${q.name}/playlist.m3u8`,
      size: getFolderSize(path.join(hlsFolder, q.name)),
    }));
    return { masterUrl, renditions };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Public processors — Movies
// ─────────────────────────────────────────────────────────────────────────────
export const processMovieHls = async (movieId: Types.ObjectId | string, sourceVideoUrl: string) => {
  try {
    await MovieModel.findByIdAndUpdate(movieId, { processingStatus: 'processing' });

    const result = await transcodeHlsMultiResolution({
      id: movieId.toString(),
      type: 'movie',
      sourceVideoUrl,
    });

    await MovieModel.findByIdAndUpdate(movieId, {
      hlsUrl:          result.hlsUrl,
      videoUrl:        sourceVideoUrl,
      hlsS3Prefix:     result.hlsS3Prefix,
      videoQualities:  result.videoQualities,
      status:          'published',
      processingStatus:'ready',
      processingError: null,
    });

    logger.info({ movieId, hlsUrl: result.hlsUrl }, 'Movie HLS processing complete');
  } catch (error: any) {
    logger.error({ error, movieId }, 'Error processing movie HLS');
    await MovieModel.findByIdAndUpdate(movieId, {
      processingStatus: 'failed',
      processingError:  error.message,
    });
  }
};

export const processMovieInBackground = (movieId: Types.ObjectId | string, sourceVideoUrl: string) => {
  setImmediate(async () => {
    await processMovieHls(movieId, sourceVideoUrl);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Public processors — Episodes
// ─────────────────────────────────────────────────────────────────────────────
export const processEpisodeHls = async (episodeId: Types.ObjectId | string, sourceVideoUrl: string) => {
  try {
    const episode = await EpisodeModel.findById(episodeId).lean();
    if (!episode) return;

    await EpisodeModel.findByIdAndUpdate(episodeId, { processingStatus: 'processing' });

    const result = await transcodeHlsMultiResolution({
      id:                   episodeId.toString(),
      type:                 'episode',
      sourceVideoUrl,
      startSeconds:         episode.sourceStartSeconds,
      duration:             episode.duration,
      episodeNumber:        episode.episode,
      contentIdForEpisode:  episode.contentId.toString(),
    });

    await EpisodeModel.findByIdAndUpdate(episodeId, {
      hlsUrl:          result.hlsUrl,
      hlsS3Prefix:     result.hlsS3Prefix,
      videoQualities:  result.videoQualities,
      processingStatus:'ready',
      processingError: null,
    });

    logger.info({ episodeId, hlsUrl: result.hlsUrl }, 'Episode HLS processing complete');
  } catch (error: any) {
    logger.error({ error, episodeId }, 'Error processing episode HLS');
    await EpisodeModel.findByIdAndUpdate(episodeId, {
      processingStatus: 'failed',
      processingError:  error.message,
    });
  }
};

export const processEpisodesInBackground = (episodeIds: Types.ObjectId[], sourceVideoUrl: string) => {
  setImmediate(async () => {
    for (const episodeId of episodeIds) {
      await processEpisodeHls(episodeId, sourceVideoUrl);
    }

    const firstEpisode = await EpisodeModel.findById(episodeIds[0]).lean();
    if (!firstEpisode) return;

    const unfinishedCount = await EpisodeModel.countDocuments({
      contentId: firstEpisode.contentId,
      processingStatus: { $in: ['queued', 'processing'] },
    });
    const failedCount = await EpisodeModel.countDocuments({
      contentId: firstEpisode.contentId,
      processingStatus: 'failed',
    });

    if (unfinishedCount === 0) {
      await ContentModel.findByIdAndUpdate(firstEpisode.contentId, {
        status: failedCount > 0 ? 'processing' : 'published',
      });
    }
  });
};
