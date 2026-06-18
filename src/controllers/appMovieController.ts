import type { FastifyReply, FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { MovieModel } from '../models/Movie';
import { ContentModel } from '../models/Content';
import { UserLikeModel } from '../models/UserLike';
import { UserWishlistModel } from '../models/UserWishlist';
import { UserWatchProgressModel } from '../models/UserWatchProgress';
import { UserDownloadModel } from '../models/UserDownload';
import { logger } from '../lib/logger';

import { buildShareUrl } from '../lib/config';

// Helper: extract optional userId from JWT without throwing
const getOptionalUserId = (request: FastifyRequest): string | null => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const server = request.server as any;
    const decoded = server.jwt.verify(authHeader.slice(7)) as any;
    return decoded?.id || null;
  } catch {
    return null;
  }
};

// ── GET /api/app/movies/:id ────────────────────────────────────────────────────
// Mobile movie detail page — returns all info needed to render the detail screen
// Optional auth: isLikedByUser and isWishlisted are false for guests
export const getMovieDetail = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return reply.status(400).send({ success: false, message: 'Invalid movie ID.' });
    }

    const userId = getOptionalUserId(request);

    // ── 1. Fetch Movie with populated cast/crew/genres ────────────────────────
    const movie = await MovieModel.findById(id)
      .populate('cast.actor', 'name image designation')
      .populate('crew.director', 'name image designation')
      .populate('genres', 'name')
      .populate('languages', 'name')
      .lean();

    if (!movie || movie.status !== 'published') {
      return reply.status(404).send({ success: false, message: 'Movie not found.' });
    }

    // ── 2. User-specific flags (like + wishlist + watch progress + download) ───
    let isLikedByUser = false;
    let isWishlisted = false;
    let wishlisted = false;
    let watchProgress = null;
    let downloaded = false;
    let isDownloaded = false;

    if (userId) {
      const [likeDoc, wishlistDoc, progressDoc, downloadDoc] = await Promise.all([
        UserLikeModel.findOne({ userId, contentId: movie._id, episodeId: null }).lean(),
        UserWishlistModel.findOne({ userId, contentId: movie._id }).lean(),
        UserWatchProgressModel.findOne({ userId, contentId: movie._id, episodeId: null }).lean(),
        UserDownloadModel.findOne({ userId, contentId: movie._id, episodeId: null }).lean(),
      ]);
      isLikedByUser = !!likeDoc;
      isWishlisted = !!wishlistDoc;
      wishlisted = !!wishlistDoc;
      downloaded = !!downloadDoc;
      isDownloaded = !!downloadDoc;
      if (progressDoc) {
        watchProgress = {
          progressSeconds: progressDoc.progressSeconds,
          durationSeconds: progressDoc.durationSeconds,
          progressPercent: progressDoc.progressPercent,
          lastWatchedAt: progressDoc.lastWatchedAt,
        };
      }
    }

    // ── 3. Related Movies (same genre, limit 10) ──────────────────────────────
    let related: any[] = [];
    if (movie.genres && movie.genres.length > 0) {
      const genreIds = (movie.genres as any[]).map((g: any) => g._id || g);
      const relatedMovies = await MovieModel.find({
        _id: { $ne: movie._id },
        status: 'published',
        genres: { $in: genreIds },
      })
        .select('title thumbnail bannerImage duration year rating genres')
        .populate('genres', 'name')
        .limit(10)
        .lean();

      related = relatedMovies.map((r: any) => ({
        id: r._id.toString(),
        title: r.title,
        thumbnail: r.thumbnail || null,
        bannerImage: r.bannerImage || null,
        duration: r.duration || null,
        year: r.year || null,
        rating: r.rating || null,
        genres: (r.genres || []).map((g: any) => g?.name || g),
        type: 'movie',
      }));
    }

    // ── 4. Map cast & crew cleanly ────────────────────────────────────────────
    const cast = (movie.cast || []).map((c: any) => ({
      id: c.actor?._id?.toString() || null,
      name: c.actor?.name || 'Unknown',
      image: c.actor?.image || null,
      designation: c.actor?.designation || null,
      role: c.role || 'Actor',
      character: c.character || null,
    }));

    const crew = (movie.crew || []).map((c: any) => ({
      id: c.director?._id?.toString() || null,
      name: c.director?.name || 'Unknown',
      image: c.director?.image || null,
      designation: c.director?.designation || null,
      role: c.role || 'Director',
    }));

    // ── 5. Format duration ────────────────────────────────────────────────────
    const hours = movie.duration ? Math.floor(movie.duration / 3600) : 0;
    const minutes = movie.duration ? Math.floor((movie.duration % 3600) / 60) : 0;
    const durationFormatted = movie.duration
      ? hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
      : null;

    // ── 6. Video settings (quality options) ──────────────────────────────────
    const hlsUrl = movie.hlsUrl || null;
    const qualities: any[] = movie.videoQualities || [];

    const videoSettings = hlsUrl
      ? [
          { key: 'auto', label: 'Auto', description: 'Adjusts quality automatically', url: hlsUrl },
          ...qualities.map((q: any) => {
            const sizeMB = q.size ? `${Math.round(q.size / (1024 * 1024))} MB` : 'N/A';
            return {
              key: q.quality,
              label: q.quality === '4k' ? '4K' : q.quality.toUpperCase(),
              description: `${q.quality.toUpperCase()} quality option (${sizeMB})`,
              url: q.url,
            };
          })
        ]
      : null;

    // ── 7. Build response ─────────────────────────────────────────────────────
    const genreNames = (movie.genres as any[]).map((g: any) => g?.name || g);
    const languageNames = (movie.languages as any[]).map((l: any) => l?.name || l);

    return reply.send({
      success: true,
      data: {
        id: movie._id.toString(),
        title: movie.title,
        originalTitle: movie.originalTitle || null,
        description: movie.description || null,
        shortDescription: movie.shortDescription || null,
        thumbnail: movie.thumbnail || null,
        bannerImage: movie.bannerImage || null,
        posterImage: movie.posterImage || null,
        trailerUrl: movie.trailerUrl || null,
        type: 'movie',

        // Video
        hlsUrl,
        videoSettings,
        playbackSpeeds: [
          { value: 0.75, label: '0.75x' },
          { value: 1.0, label: 'Normal' },
          { value: 1.25, label: '1.25x' },
          { value: 1.5, label: '1.5x' },
          { value: 1.75, label: '1.75x' },
          { value: 2.0, label: '2.0x' }
        ],
        isLocked: movie.planRequired !== 'free',

        // Meta
        genres: genreNames,
        genresText: genreNames.join(' & '),
        languages: languageNames,
        year: movie.year || null,
        rating: movie.rating || null,
        ageRating: movie.ageRating || 0,
        duration: movie.duration || null,
        durationFormatted,
        episodeMeta: `HD • ${genreNames.join(', ')} • ${durationFormatted || 'N/A'}`,
        imdbRating: movie.imdbRating || null,
        planRequired: movie.planRequired || 'free',
        isExclusive: movie.isExclusive || false,
        featured: movie.featured || false,
        trending: movie.trending || false,
        releaseDate: movie.releaseDate || null,
        country: movie.country || null,
        studio: movie.studio || null,

        // Stats
        views: movie.views || 0,
        likeCount: movie.likes || 0,
        shares: movie.shares || 0,

        // User flags
        isLikedByUser,
        isWishlisted,
        wishlisted,
        watchProgress,
        downloaded,
        isDownloaded,

        // Share
        shareUrl: buildShareUrl(movie._id.toString()),

        // People
        cast,
        crew,

        // Related
        related,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Error getting movie detail');
    return reply.status(500).send({ success: false, message: 'Failed to fetch movie detail.', error: error.message });
  }
};
