import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MediaFileModel, IHlsQuality } from '../models/MediaFile';
import { uploadToS3, isS3Configured, getS3Settings, getS3Client, getHlsPublicBaseUrl } from './s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const TEMP_DIR = path.join(UPLOADS_ROOT, 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// Define qualities: 144p to 4K (2160p), we'll adapt to max height of input
const QUALITY_PRESETS = [
  { quality: '144p', height: 144, bitrate: 200 },
  { quality: '240p', height: 240, bitrate: 400 },
  { quality: '360p', height: 360, bitrate: 800 },
  { quality: '480p', height: 480, bitrate: 1200 },
  { quality: '720p', height: 720, bitrate: 2500 },
  { quality: '1080p', height: 1080, bitrate: 5000 },
  { quality: '1440p', height: 1440, bitrate: 8000 },
  { quality: '2160p', height: 2160, bitrate: 16000 },
];

// Helper to download file from S3 to temp location
const downloadFromS3ToTemp = async (s3Key: string, tempFilePath: string): Promise<void> => {
  const settings = await getS3Settings();
  const s3Client = await getS3Client();
  const command = new GetObjectCommand({
    Bucket: settings.bucket,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error('No response body from S3');
  }

  // Write the response body to a file
  const writeStream = fs.createWriteStream(tempFilePath);
  const bodyStream = response.Body as NodeJS.ReadableStream;

  return new Promise((resolve, reject) => {
    bodyStream.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    bodyStream.on('error', reject);
  });
};

export const getVideoInfo = (filePath: string): Promise<{ duration: number; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        logger.error(err, 'Error getting video info');
        reject(err);
        return;
      }
      const stream = metadata.streams.find(s => s.codec_type === 'video');
      if (!stream) {
        reject(new Error('No video stream found'));
        return;
      }
      resolve({
        duration: metadata.format.duration || 0,
        width: stream.width || 0,
        height: stream.height || 0,
      });
    });
  });
};

export const transcodeToHls = async (
  mediaFileId: string,
  inputFilePath: string,
  baseUrl: string,
  storageType: 'local' | 's3'
): Promise<void> => {
  const mediaFile = await MediaFileModel.findById(mediaFileId);
  if (!mediaFile) {
    throw new Error('Media file not found');
  }

  let tempFilePath: string | null = null;
  try {
    // Update status to processing
    mediaFile.hlsStatus = 'processing';
    await mediaFile.save();

    // If storage type is S3, download the file to temp directory first
    if (storageType === 's3' && mediaFile.s3Key) {
      const tempFileName = `${mediaFile._id.toString()}${path.extname(mediaFile.name || '.mp4')}`;
      tempFilePath = path.join(TEMP_DIR, tempFileName);
      await downloadFromS3ToTemp(mediaFile.s3Key, tempFilePath);
      inputFilePath = tempFilePath;
    }

    const { duration, width, height } = await getVideoInfo(inputFilePath);
    mediaFile.duration = Math.round(duration);

    // Determine which presets to use based on input height
    const applicablePresets = QUALITY_PRESETS.filter(preset => preset.height <= height);
    // If video is smaller than 144p, add at least 144p
    if (applicablePresets.length === 0) {
      applicablePresets.push(QUALITY_PRESETS[0]);
    }

    // Create output directory
    const hlsOutputDir = path.join(UPLOADS_ROOT, 'hls', mediaFile._id.toString());
    if (!fs.existsSync(hlsOutputDir)) {
      fs.mkdirSync(hlsOutputDir, { recursive: true });
    }

    const qualities: IHlsQuality[] = [];

    // Transcode each quality
    for (const preset of applicablePresets) {
      const outputDir = path.join(hlsOutputDir, preset.quality);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const playlistPath = path.join(outputDir, 'index.m3u8');
      const segmentPattern = path.join(outputDir, 'segment-%03d.ts');

      await new Promise((resolve, reject) => {
        ffmpeg(inputFilePath)
          .outputOptions([
            '-preset', 'fast',
            '-g', '48',
            '-sc_threshold', '0',
            '-keyint_min', '48',
            '-hls_time', '4',
            '-hls_list_size', '0',
            '-hls_segment_filename', segmentPattern,
            '-vf', `scale=-2:${preset.height}`,
            '-b:v', `${preset.bitrate}k`,
            '-maxrate', `${preset.bitrate * 1.5}k`,
            '-bufsize', `${preset.bitrate * 2}k`,
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ac', '2',
          ])
          .output(playlistPath)
          .on('start', (commandLine) => {
            logger.debug({ commandLine }, `Starting HLS transcoding for ${preset.quality}`);
          })
          .on('progress', (progress) => {
            logger.debug({ percent: progress.percent, preset: preset.quality }, 'HLS transcoding progress');
          })
          .on('end', async () => {
            logger.info(`HLS transcoding for ${preset.quality} complete`);
            resolve(null);
          })
          .on('error', (err, stdout, stderr) => {
            logger.error({ err, stdout, stderr }, `Error transcoding to ${preset.quality}`);
            reject(err);
          })
          .run();
      });

      const relativePlaylistPath = `hls/${mediaFile._id.toString()}/${preset.quality}/index.m3u8`;
      let qualityUrl: string;

      if (storageType === 's3' && await isS3Configured()) {
        // Upload all files for this quality to S3
        const files = fs.readdirSync(outputDir);
        for (const file of files) {
          const filePath = path.join(outputDir, file);
          const buffer = fs.readFileSync(filePath);
          const s3Key = `hls/${mediaFile._id.toString()}/${preset.quality}/${file}`;
          await uploadToS3(s3Key, buffer, file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T');
        }
        const s3Key = `hls/${mediaFile._id.toString()}/${preset.quality}/index.m3u8`;
        const hlsBaseUrl = await getHlsPublicBaseUrl();
        qualityUrl = `${hlsBaseUrl}/${s3Key}`;
      } else {
        // Local storage
        qualityUrl = `${baseUrl}/uploads/${relativePlaylistPath}`;
      }

      qualities.push({
        quality: preset.quality,
        url: qualityUrl,
        filePath: `/uploads/${relativePlaylistPath}`,
        bitrate: preset.bitrate,
        resolution: `${Math.round(width * (preset.height / height))}x${preset.height}`,
      });
    }

    // Create master playlist
    let masterPlaylistContent = '#EXTM3U\n';
    for (const q of qualities) {
      const preset = applicablePresets.find(p => p.quality === q.quality);
      if (preset) {
        masterPlaylistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${preset.bitrate * 1000},RESOLUTION=${q.resolution}\n`;
        masterPlaylistContent += `${q.quality}/index.m3u8\n`;
      }
    }

    const masterPlaylistPath = path.join(hlsOutputDir, 'index.m3u8');
    fs.writeFileSync(masterPlaylistPath, masterPlaylistContent);

    let masterPlaylistUrl: string;
    const relativeMasterPlaylistPath = `hls/${mediaFile._id.toString()}/index.m3u8`;

    if (storageType === 's3' && await isS3Configured()) {
      const buffer = fs.readFileSync(masterPlaylistPath);
      const s3Key = `hls/${mediaFile._id.toString()}/index.m3u8`;
      await uploadToS3(s3Key, buffer, 'application/x-mpegURL');
      const hlsBaseUrl = await getHlsPublicBaseUrl();
      masterPlaylistUrl = `${hlsBaseUrl}/${s3Key}`;
    } else {
      masterPlaylistUrl = `${baseUrl}/uploads/${relativeMasterPlaylistPath}`;
    }

    // Update media file with HLS data
    mediaFile.isHls = true;
    mediaFile.hlsMasterPlaylistUrl = masterPlaylistUrl;
    mediaFile.hlsMasterPlaylistPath = `/uploads/${relativeMasterPlaylistPath}`;
    mediaFile.hlsQualities = qualities;
    mediaFile.hlsStatus = 'completed';
    await mediaFile.save();

  } catch (error) {
    logger.error({ error }, 'Error transcoding to HLS');
    mediaFile.hlsStatus = 'failed';
    mediaFile.hlsError = error instanceof Error ? error.message : String(error);
    await mediaFile.save();
    throw error;
  } finally {
    // Clean up the temp file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        logger.warn({ cleanupError, tempFilePath }, 'Failed to clean up temp file');
      }
    }
  }
};

export default {
  getVideoInfo,
  transcodeToHls,
};
