import type { FastifyReply, FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { ContentModel } from '../models/Content';
import { MovieModel } from '../models/Movie';
import { EpisodeModel } from '../models/Episode';
import { UserLikeModel } from '../models/UserLike';
import { UserModel } from '../models/User';
import '../models/Actor';
import '../models/Director';
import { logger } from '../lib/logger';

// Plan hierarchy
const PLAN_LEVELS: Record<string, number> = {
  free: 0,
  basic: 1,
  standard: 2,
  premium: 3,
};

const API_URL = (process.env.API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

const buildShareUrl = (item: any): string => `${API_URL}/share/${item._id.toString()}`;

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
    return (PLAN_LEVELS[userPlan] ?? 0) >= (PLAN_LEVELS[contentPlanRequired] ?? 0);
  }
  return true;
};

// Build standard Video Settings array from hlsUrl and videoQualities
const buildVideoSettings = (hlsUrl: string | null, qualities: any[] = []) => {
  const autoUrl = hlsUrl || null;
  const bestUrl = qualities.find((q: any) => q.quality === '1080p')?.url || qualities.find((q: any) => q.quality === '720p')?.url || autoUrl;
  const dataSaverUrl = qualities.find((q: any) => q.quality === '360p')?.url || qualities.find((q: any) => q.quality === '144p')?.url || autoUrl;

  return [
    { key: 'auto', label: 'Auto (Recommended)', description: 'Adjusts the video quality to give you the best experience for your conditions', url: autoUrl },
    { key: 'best', label: 'Best Quality', description: 'Best watching experience, uses more data', url: bestUrl },
    { key: 'dataSaver', label: 'Data Saver', description: 'Lower video quality, saves data', url: dataSaverUrl },
  ];
};

export const getWatchData = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { contentId } = request.params as { contentId: string };
    const query = request.query as { season?: string; episode?: string };

    const requestedSeason = Math.max(1, Number(query.season || 1));
    const requestedEpisode = Math.max(1, Number(query.episode || 1));

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return reply.status(400).send({ success: false, message: 'Invalid contentId.' });
    }

    const userInfo = await getOptionalUser(request);
    const userId = userInfo?.userId || null;
    const userPlan = userInfo?.userPlan || 'free';

    // ── 1. Check if Series/Drama ──────────────────────────────────────────────
    let content: any = await ContentModel.findById(contentId).lean();
    let isMovieType = false;

    // ── 2. If not found, check Movie ──────────────────────────────────────────
    if (!content) {
      content = await MovieModel.findById(contentId)
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

    // ── 3. Handle Like Status ─────────────────────────────────────────────────
    let isLikedByUser = false;
    if (userId) {
      const liked = await UserLikeModel.findOne({ userId, contentId: content._id }).lean();
      isLikedByUser = !!liked;
    }

    // ── 4. Map Cast & Crew ────────────────────────────────────────────────────
    let cast: any[] = [];
    let crew: any[] = [];
    
    if (isMovieType) {
      cast = (content.cast || []).map((c: any) => ({
        id: c.actor?._id?.toString() || null,
        name: c.actor?.name || 'Unknown',
        image: c.actor?.image || null,
        role: c.role || 'Actor',
        character: c.character || null,
      }));
      crew = (content.crew || []).map((c: any) => ({
        id: c.director?._id?.toString() || null,
        name: c.director?.name || 'Unknown',
        image: c.director?.image || null,
        role: c.role || 'Director',
      }));
    } else {
      cast = (content.cast || []).map((c: any) => ({ name: c.name, image: c.photo || null, role: c.role || 'Actor', character: c.character || null }));
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
        relatedContents = related.map(r => ({ id: r._id.toString(), title: r.title, thumbnail: r.thumbnail, duration: r.duration, type: 'movie' }));
      } else {
        const related = await ContentModel.find(relatedFilter).select('title thumbnail type contentType').limit(5).lean();
        relatedContents = related.map(r => ({ id: r._id.toString(), title: r.title, thumbnail: r.thumbnail, type: r.contentType || 'series' }));
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
      
      currentEpisode = {
        id: content._id.toString(),
        title: content.title,
        duration: content.duration || null,
        isFree: contentPlan === 'free',
        isLocked: !isAccessible,
        hlsUrl: isAccessible ? content.hlsUrl || null : null,
        trailerUrl: content.trailerUrl || null,
        videoSettings: isAccessible ? buildVideoSettings(content.hlsUrl, content.videoQualities) : null,
      };

      const hours = content.duration ? Math.floor(content.duration / 3600) : 0;
      const minutes = content.duration ? Math.floor((content.duration % 3600) / 60) : 0;
      const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      episodeMeta = `HD • ${(content.genres || []).join(', ')} • ${durationStr}`;
      
      totalSeasons = 0;
      totalEpisodes = 1;
    } 
    // ── 8. Logic for Series / Dramas ──────────────────────────────────────────
    else {
      const allEpisodes = await EpisodeModel.find({ contentId: content._id }).sort({ season: 1, episode: 1 }).lean();
      
      const seasonMap = new Map<number, any[]>();
      allEpisodes.forEach(ep => {
        if (!seasonMap.has(ep.season)) seasonMap.set(ep.season, []);
        seasonMap.get(ep.season)!.push(ep);
      });

      totalEpisodes = allEpisodes.length;
      totalSeasons = seasonMap.size;
      episodeMeta = `${requestedEpisode} of ${totalEpisodes} Episodes • Season ${requestedSeason} • ${(content.genres || []).join(', ')}`;

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
          hlsUrl: accessible ? ep.hlsUrl || null : null,
          trailerUrl: ep.trailerUrl || null,
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
          currentEpisode.videoSettings = buildVideoSettings(currentEpisodeRaw.hlsUrl, (content as any).videoQualities);
        } else {
          currentEpisode.videoSettings = null;
        }
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
          thumbnail: content.thumbnail || null,
          bannerImage: content.bannerImage || null,
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
          shareUrl: buildShareUrl(content),
          
          cast,
          crew,
          related: relatedContents,
        },
        currentEpisode,
        seasons,
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
