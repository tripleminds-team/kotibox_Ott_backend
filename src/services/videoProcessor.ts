import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Types } from 'mongoose';
import { MovieModel } from '../models/Movie';
import { isS3Configured, getS3PublicUrl } from '../lib/s3';

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

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const toLocalUploadPath = (urlPath: string): string | null => {
  if (!urlPath) return null;
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  let relPath = urlPath;
  if (relPath.startsWith('/uploads/')) {
    relPath = relPath.replace('/uploads/', '');
  } else if (relPath.startsWith('uploads/')) {
    relPath = relPath.replace('uploads/', '');
  } else if (relPath.startsWith('/media/')) {
    relPath = relPath.replace('/', '');
  }
  return path.join(uploadsRoot, relPath);
};

export const processMovieHls = async (movieId: Types.ObjectId | string, sourceVideoUrl: string) => {
  try {
    const movie = await MovieModel.findById(movieId).lean();
    if (!movie) return;

    await MovieModel.findByIdAndUpdate(movieId, { processingStatus: 'processing' });

    let ffmpegInput = '';
    const s3Active = await isS3Configured();

    if (s3Active) {
      // If S3 is active, the raw file is stored in S3.
      // FFmpeg can stream it directly from S3.
      ffmpegInput = await getS3PublicUrl(sourceVideoUrl);
    } else {
      const sourceVideoPath = toLocalUploadPath(sourceVideoUrl);
      if (!sourceVideoPath || !fs.existsSync(sourceVideoPath)) {
        await MovieModel.findByIdAndUpdate(movieId, {
          processingStatus: 'failed',
          processingError: 'Source video not found on disk: ' + sourceVideoPath,
        });
        return;
      }
      ffmpegInput = sourceVideoPath;
    }

    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const hlsFolder = path.join(uploadsRoot, 'hls', 'movies', movieId.toString());
    ensureDir(hlsFolder);

    const outputPattern = path.join(hlsFolder, 'segment_%03d.ts');
    const playlistPath = path.join(hlsFolder, 'playlist.m3u8');
    ensureDir(path.dirname(outputPattern));

    // Full movie conversion
    await runCommand('ffmpeg', [
      '-y', // Overwrite output files
      '-i', ffmpegInput,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'veryfast', // Increase transcoding speed
      '-f', 'hls',
      '-hls_time', '10',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', outputPattern,
      playlistPath
    ]);

    await MovieModel.findByIdAndUpdate(movieId, {
      hlsUrl: `/uploads/hls/movies/${movieId.toString()}/playlist.m3u8`,
      status: 'published',
      processingStatus: 'ready',
      processingError: null,
    });
  } catch (error: any) {
    console.error('Error processing movie HLS:', error);
    await MovieModel.findByIdAndUpdate(movieId, {
      processingStatus: 'failed',
      processingError: error.message,
    });
  }
};

export const processMovieInBackground = (movieId: Types.ObjectId | string, sourceVideoUrl: string) => {
  setImmediate(async () => {
    await processMovieHls(movieId, sourceVideoUrl);
  });
};
