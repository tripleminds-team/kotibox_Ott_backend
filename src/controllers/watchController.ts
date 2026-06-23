import type { FastifyReply, FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { ContentModel } from '../models/Content';
import { MovieModel } from '../models/Movie';
import { EpisodeModel } from '../models/Episode';
import { UserLikeModel } from '../models/UserLike';
import { UserWishlistModel } from '../models/UserWishlist';
import { UserDownloadModel } from '../models/UserDownload';
import { UserModel } from '../models/User';
import { UserWatchProgressModel } from '../models/UserWatchProgress';
import '../models/Actor';
import '../models/Director';
import { logger } from '../lib/logger';
import { isS3Configured, getS3PublicUrl } from '../lib/s3';

// Plan hierarchy
const PLAN_LEVELS: Record<string, number> = {
  free: 0,
  basic: 1,
  standard: 2,
  premium: 3,
};

import { buildShareUrl } from '../lib/config';

const getOptionalUser = async (request: FastifyRequest): Promise<{ userId: string; userPlan: string } | null> => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const server = request.server as any;
    const decoded = server.jwt.verify(authHeader.slice(7)) as any;
    if (!decoded?.id) return null;

    const user = await UserModel.findById(decoded.id).select('subscriptionPlan subscriptionStatus subscriptionExpiry').lean();
    if (!user) return null;

    const isActive = user.subscriptionStatus === 'active' && (!user.subscriptionExpiry || user.subscriptionExpiry > new Date());
    return { userId: decoded.id, userPlan: isActive ? (user.subscriptionPlan || 'free') : 'free' };
  } catch {
    return null;
  }
};

const canAccessItem = (isFree: boolean, isLocked: boolean, contentPlanRequired: string, userPlan: string): boolean => {
  if (isFree) return true;
  if (isLocked) {
    // If the episode is locked, the user must have at least a 'basic' plan (level 1), 
    // or higher if the content itself requires a higher plan
    const requiredLevel = Math.max(PLAN_LEVELS[contentPlanRequired] ?? 0, 1);
    return (PLAN_LEVELS[userPlan] ?? 0) >= requiredLevel;
  }
  return true;
};

// Helper to convert relative URLs to absolute URLs
const toAbsoluteUrl = (
  request: FastifyRequest,
  url: string | null | undefined,
  s3Active: boolean,
  s3BaseUrl: string
): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  const isLocalHls = url.startsWith('hls/') || url.startsWith('/uploads/hls/') || url.includes('/hls/');
  if (s3Active && !isLocalHls) {
    let cleanKey = url;
    if (cleanKey.startsWith('/')) cleanKey = cleanKey.slice(1);
    if (cleanKey.startsWith('uploads/')) cleanKey = cleanKey.replace('uploads/', '');
    if (cleanKey.startsWith('/uploads/')) cleanKey = cleanKey.replace('/uploads/', '');
    return `${s3BaseUrl}/${cleanKey}`;
  }
  
  let relPath = url;
  if (!relPath.startsWith('/uploads/')) {
    relPath = relPath.startsWith('uploads/') ? `/${relPath}` : `/uploads/${relPath.startsWith('/') ? relPath.slice(1) : relPath}`;
  }
  
  const baseUrl = `${request.protocol}://${request.hostname}`;
  return `${baseUrl}${relPath}`;
};

// Build standard Video Settings array from hlsUrl and per-item videoQualities.
const buildVideoSettings = (
  request: FastifyRequest,
  hlsUrl: string | null,
  qualities: any[] = [],
  s3Active: boolean,
  s3BaseUrl: string
) => {
  const autoUrl = toAbsoluteUrl(request, hlsUrl, s3Active, s3BaseUrl) || null;

  // Best quality: prefer 1080p → 720p → 480p → hlsUrl (never null when hlsUrl exists)
  const bestUrl =
    toAbsoluteUrl(request, qualities.find((q: any) => q.quality === '1080p')?.url, s3Active, s3BaseUrl) ||
    toAbsoluteUrl(request, qualities.find((q: any) => q.quality === '720p')?.url, s3Active, s3BaseUrl) ||
    toAbsoluteUrl(request, qualities.find((q: any) => q.quality === '480p')?.url, s3Active, s3BaseUrl) ||
    autoUrl;

  // Data saver: prefer 360p → 144p → hlsUrl (same source, adaptive stream)
  const dataSaverUrl =
    toAbsoluteUrl(request, qualities.find((q: any) => q.quality === '360p')?.url, s3Active, s3BaseUrl) ||
    toAbsoluteUrl(request, qualities.find((q: any) => q.quality === '144p')?.url, s3Active, s3BaseUrl) ||
    autoUrl; // fall back to the adaptive HLS stream, NOT to a higher-res MP4

  return [
    { key: 'auto', label: 'Auto', description: 'Adjusts the video quality to give you the best experience for your conditions', url: autoUrl },
    { key: 'best', label: 'Best Quality', description: 'Best watching experience, uses more data', url: bestUrl },
    { key: 'dataSaver', label: 'Data Saver', description: 'Lower video quality, saves data', url: dataSaverUrl },
  ];
};

export const getWatchData = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { contentId } = request.params as { contentId: string };
    const query = request.query as { season?: string; episode?: string };

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return reply.status(400).send({ success: false, message: 'Invalid contentId.' });
    }

    const userInfo = await getOptionalUser(request);
    const userId = userInfo?.userId || null;
    const userPlan = userInfo?.userPlan || 'free';

    // Cast userId to ObjectId once for ALL DB lookups
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    let requestedSeason = query.season ? Math.max(1, Number(query.season)) : null;
    let requestedEpisode = query.episode ? Math.max(1, Number(query.episode)) : null;

    // Default to last watched episode if user is logged in and query is not specified
    if (userObjectId && (requestedSeason === null || requestedEpisode === null)) {
      const lastProgress = await UserWatchProgressModel.findOne({ userId: userObjectId, contentId })
        .sort({ lastWatchedAt: -1 })
        .populate('episodeId')
        .lean();
      
      if (lastProgress && lastProgress.episodeId) {
        const epDoc = lastProgress.episodeId as any;
        if (requestedSeason === null) requestedSeason = epDoc.season;
        if (requestedEpisode === null) requestedEpisode = epDoc.episode;
      }
    }

    // Default to Season 1, Episode 1 if still not determined
    if (requestedSeason === null) requestedSeason = 1;
    if (requestedEpisode === null) requestedEpisode = 1;

    // ── 1. Check if Series/Drama ──────────────────────────────────────────────
    let content: any = await ContentModel.findById(contentId).populate('genres', 'name').lean();
    let isMovieType = false;

    // ── 2. If not found, check Movie ──────────────────────────────────────────
    if (!content) {
      content = await MovieModel.findById(contentId)
        .populate('genres', 'name')
        .populate('cast.actor', 'name image')
        .populate('crew.director', 'name image')
        .lean();
      
      if (!content || content.status !== 'published') {
        return reply.status(404).send({ success: false, message: 'Content not found.' });
      }
      isMovieType = true;
    } else if (content.status !== 'published') {
      return reply.status(404).send({ success: false, message: 'Content not found.' });
    }

    const contentPlan = content.planRequired || 'free';

    // ── 3. Handle Like / Wishlist / Download Status ───────────────────────
    let isLikedByUser = false;
    let isWishlisted = false;
    let isDownloaded = false;
    let likedEpisodeIdSet = new Set<string>();
    if (userObjectId) {
      const [likeDoc, wishlistDoc, downloadDoc] = await Promise.all([
        UserLikeModel.findOne({ userId: userObjectId, contentId: content._id, episodeId: null }).lean(),
        UserWishlistModel.findOne({ userId: userObjectId, contentId: content._id }).lean(),
        UserDownloadModel.findOne({ userId: userObjectId, contentId: content._id }).lean(),
      ]);
      isLikedByUser = !!likeDoc;
      isWishlisted = !!wishlistDoc;
      isDownloaded = !!downloadDoc;
    }

    // Load S3 settings once for dynamic absolute URL resolution
    const s3Active = await isS3Configured();
    let s3BaseUrl = '';
    if (s3Active) {
      const s3Url = await getS3PublicUrl('');
      s3BaseUrl = s3Url.endsWith('/') ? s3Url.slice(0, -1) : s3Url;
    }

    // ── 4. Map Cast & Crew ────────────────────────────────────────────────────
    let cast: any[] = [];
    let crew: any[] = [];
    
    if (isMovieType) {
      cast = (content.cast || []).map((c: any) => ({
        id: c.actor?._id?.toString() || null,
        name: c.actor?.name || 'Unknown',
        image: toAbsoluteUrl(request, c.actor?.image, s3Active, s3BaseUrl) || null,
        role: c.role || 'Actor',
        character: c.character || null,
      }));
      crew = (content.crew || []).map((c: any) => ({
        id: c.director?._id?.toString() || null,
        name: c.director?.name || 'Unknown',
        image: toAbsoluteUrl(request, c.director?.image, s3Active, s3BaseUrl) || null,
        role: c.role || 'Director',
      }));
    } else {
      cast = (content.cast || []).map((c: any) => ({ name: c.name, image: toAbsoluteUrl(request, c.photo, s3Active, s3BaseUrl) || null, role: c.role || 'Actor', character: c.character || null }));
      crew = (content.crew || []).map((c: any) => ({ name: c.name, image: null, role: c.role || 'Crew' }));
    }

    // ── 5. Fetch Related Content ──────────────────────────────────────────────
    // Simple related logic: Same genre, excluding current item, limit 5
    let relatedContents: any[] = [];
    if (content.genres && content.genres.length > 0) {
      const relatedFilter: any = {
        _id: { $ne: content._id },
        status: 'published',
        genres: { $in: content.genres }
      };
      
      if (isMovieType) {
        const related = await MovieModel.find(relatedFilter).select('title thumbnail duration type').limit(5).lean();
        relatedContents = related.map(r => ({ id: r._id.toString(), title: r.title, thumbnail: toAbsoluteUrl(request, r.thumbnail, s3Active, s3BaseUrl), duration: r.duration, type: 'movie' }));
      } else {
        const related = await ContentModel.find(relatedFilter).select('title thumbnail type contentType').limit(5).lean();
        relatedContents = related.map(r => ({ id: r._id.toString(), title: r.title, thumbnail: toAbsoluteUrl(request, r.thumbnail, s3Active, s3BaseUrl), type: r.contentType || 'series' }));
      }
    }

    // ── 6. Prepare Response Variables ─────────────────────────────────────────
    let currentEpisode: any = null;
    let seasons: any[] = [];
    let totalSeasons = 0;
    let totalEpisodes = 0;
    let episodeMeta = '';

    // ── 7. Logic for Movies ───────────────────────────────────────────────────
    if (isMovieType) {
      const isAccessible = canAccessItem(contentPlan === 'free', contentPlan !== 'free', contentPlan, userPlan);
      
      let watchProgress = null;
      if (userObjectId) {
        const progressDoc = await UserWatchProgressModel.findOne({ userId: userObjectId, contentId: content._id, episodeId: null }).lean();
        if (progressDoc) {
          watchProgress = {
            progressSeconds: progressDoc.progressSeconds,
            durationSeconds: progressDoc.durationSeconds,
            progressPercent: progressDoc.progressPercent,
            lastWatchedAt: progressDoc.lastWatchedAt,
          };
        }
      }

      currentEpisode = {
        id: content._id.toString(),
        title: content.title,
        duration: content.duration || null,
        isFree: contentPlan === 'free',
        isLocked: !isAccessible,
        hlsUrl: isAccessible ? toAbsoluteUrl(request, content.hlsUrl, s3Active, s3BaseUrl) : null,
        trailerUrl: toAbsoluteUrl(request, content.trailerUrl, s3Active, s3BaseUrl),
        videoSettings: isAccessible ? buildVideoSettings(request, content.hlsUrl, content.videoQualities, s3Active, s3BaseUrl) : null,
        watchProgress,
      };

      const hours = content.duration ? Math.floor(content.duration / 3600) : 0;
      const minutes = content.duration ? Math.floor((content.duration % 3600) / 60) : 0;
      const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      const genresText = (content.genres || []).map((g: any) => g.name || g).join(', ');
      episodeMeta = `HD • ${genresText} • ${durationStr}`;
      
      totalSeasons = 0;
      totalEpisodes = 1;
    } 
    // ── 8. Logic for Series / Dramas ──────────────────────────────────────────
    else {
      const allEpisodes = await EpisodeModel.find({ contentId: content._id }).sort({ season: 1, episode: 1 }).lean();

      // Fetch which episodes the user has liked (episode-level likes)
      if (userObjectId && allEpisodes.length > 0) {
        const episodeIds = allEpisodes.map(ep => ep._id);
        const episodeLikes = await UserLikeModel.find({
          userId: userObjectId,
          contentId: content._id,
          episodeId: { $in: episodeIds },
        }).select('episodeId').lean();
        episodeLikes.forEach(l => {
          if (l.episodeId) likedEpisodeIdSet.add(l.episodeId.toString());
        });
      }
      
      const seasonMap = new Map<number, any[]>();
      allEpisodes.forEach(ep => {
        if (!seasonMap.has(ep.season)) seasonMap.set(ep.season, []);
        seasonMap.get(ep.season)!.push(ep);
      });

      totalEpisodes = allEpisodes.length;
      totalSeasons = seasonMap.size;
      const genresText = (content.genres || []).map((g: any) => g.name || g).join(', ');
      episodeMeta = `${requestedEpisode} of ${totalEpisodes} Episodes • Season ${requestedSeason} • ${genresText}`;

      const mapEpisode = (ep: any) => {
        const accessible = canAccessItem(ep.isFree, ep.isLocked || contentPlan !== 'free', contentPlan, userPlan);
        return {
          id: ep._id.toString(),
          season: ep.season,
          episodeNumber: ep.episode,
          title: ep.title,
          duration: ep.duration || null,
          isFree: ep.isFree,
          isLocked: !accessible,
          hlsUrl: accessible ? toAbsoluteUrl(request, ep.hlsUrl, s3Active, s3BaseUrl) : null,
          trailerUrl: toAbsoluteUrl(request, ep.trailerUrl, s3Active, s3BaseUrl),
          likeCount: ep.likes || 0,
          isLikedByUser: likedEpisodeIdSet.has(ep._id.toString()),
        };
      };

      seasons = Array.from(seasonMap.entries()).map(([seasonNum, episodes]) => ({
        seasonNumber: seasonNum,
        totalEpisodes: episodes.length,
        episodes: episodes.map(mapEpisode),
      }));

      const currentEpisodeRaw = allEpisodes.find(ep => ep.season === requestedSeason && ep.episode === requestedEpisode) || allEpisodes[0];
      if (currentEpisodeRaw) {
        currentEpisode = mapEpisode(currentEpisodeRaw);
        if (!currentEpisode.isLocked) {
          currentEpisode.videoSettings = buildVideoSettings(
            request,
            currentEpisodeRaw.hlsUrl,
            currentEpisodeRaw.videoQualities || [],
            s3Active,
            s3BaseUrl
          );
        } else {
          currentEpisode.videoSettings = null;
        }

        let watchProgress = null;
        if (userObjectId) {
          const progressDoc = await UserWatchProgressModel.findOne({
            userId: userObjectId,
            contentId: content._id,
            episodeId: currentEpisodeRaw._id,
          }).lean();
          if (progressDoc) {
            watchProgress = {
              progressSeconds: progressDoc.progressSeconds,
              durationSeconds: progressDoc.durationSeconds,
              progressPercent: progressDoc.progressPercent,
              lastWatchedAt: progressDoc.lastWatchedAt,
            };
          }
        }
        currentEpisode.watchProgress = watchProgress;
      }
    }

    // ── 9. Final Output ───────────────────────────────────────────────────────
    return reply.send({
      success: true,
      data: {
        content: {
          id: content._id.toString(),
          title: content.title,
          description: content.description || null,
          shortDescription: content.shortDescription || null,
          thumbnail: toAbsoluteUrl(request, content.thumbnail, s3Active, s3BaseUrl) || null,
          bannerImage: toAbsoluteUrl(request, content.bannerImage, s3Active, s3BaseUrl) || null,
          genres: content.genres || [],
          genresText: (content.genres || []).join(' & '),
          languages: content.languages || [],
          type: isMovieType ? 'movie' : (content.contentType || 'drama'),
          
          totalSeasons,
          totalEpisodes,
          episodeMeta,
          
          year: content.year || null,
          rating: content.rating || null,
          ageRating: content.ageRating || 0,
          planRequired: contentPlan,
          isExclusive: content.isExclusive || false,
          views: content.views || 0,
          likeCount: content.likes || 0,
          isLikedByUser,
          isWishlisted,
          isDownloaded,
          shareUrl: buildShareUrl(content._id.toString()),
          
          cast,
          crew,
          related: relatedContents,
        },
        currentEpisode,
        seasons,
        playbackSpeeds: [
          { value: 0.75, label: '0.75x' },
          { value: 1.0, label: 'Normal' },
          { value: 1.25, label: '1.25x' },
          { value: 1.5, label: '1.5x' },
          { value: 1.75, label: '1.75x' },
          { value: 2.0, label: '2.0x' }
        ],
        userAccess: {
          isLoggedIn: !!userId,
          userPlan,
          canAccessCurrentEpisode: currentEpisode ? !currentEpisode.isLocked : false,
        },
      },
    });
  } catch (error: any) {
    logger.error(error, 'Error fetching watch data');
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch watch data.',
      error: error.message,
    });
  }
};
