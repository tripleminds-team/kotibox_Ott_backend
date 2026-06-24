import type { FastifyReply, FastifyRequest } from 'fastify';
import { BannerModel } from '../models/Banner';
import { MovieModel } from '../models/Movie';
import { ContentModel } from '../models/Content';
import { EpisodeModel } from '../models/Episode';
import { SectionModel } from '../models/Section';
import { UserLikeModel } from '../models/UserLike';
import { UserModel } from '../models/User';
import { LanguageModel } from '../models/Language';
import { UserWatchProgressModel } from '../models/UserWatchProgress';
import { logger } from '../lib/logger';
import mongoose from 'mongoose';

// Base URL for the backend API (used for smart share links)
import { API_URL, buildShareUrl } from '../lib/config';

// Helper: try to extract userId from JWT (optional auth — no error if missing/invalid)
const getOptionalUserId = (request: FastifyRequest): string | null => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    const server = request.server as any;
    const decoded = server.jwt.verify(token) as any;
    return decoded?.id || null;
  } catch {
    return null;
  }
};



// Helper function to map content items
const mapContentItem = (
  item: any,
  type: string,
  episodeCount = 0,
  firstEpisode?: any,
  likeCount = 0,
  isLikedByUser = false,
) => ({
  id: item._id.toString(),
  title: item.title,
  description: item.description,
  shortDescription: item.shortDescription,
  thumbnail: item.thumbnail,
  bannerImage: item.bannerImage,
  type,
  episodeCount,
  genres: item.genres,
  genresText: item.genres?.join(' & ') || '',
  languages: item.languages,
  views: item.views || 0,
  likeCount,
  isLikedByUser,
  shares: item.shares || 0,
  shareUrl: buildShareUrl(item._id.toString()),
  featured: item.featured,
  trending: item.trending,
  isNewContent: item.isNewContent,
  rating: item.rating,
  year: item.year,
  duration: item.duration,
  status: item.status,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  // Preview video info — only first episode (short-drama reel style)
  videoUrl: firstEpisode?.hlsUrl || item.hlsUrl || null,
  trailerUrl: firstEpisode?.trailerUrl || item.trailerUrl || null,
  firstEpisodeId: firstEpisode?._id?.toString() || null,
  firstEpisodeTitle: firstEpisode?.title || null,
  firstEpisodeThumbnail: firstEpisode?.thumbnail || item.thumbnail || null,
  firstEpisodeDuration: firstEpisode?.duration || null,
  firstEpisodeIsFree: firstEpisode?.isFree ?? null,
});

// Helper function to map banner
const mapBanner = (
  banner: any,
  episodeCount = 0,
  firstEpisode?: any,
  likeCount = 0,
  isLikedByUser = false,
) => {
  const content = banner.contentId;
  const thumbnail = content?.thumbnail || banner.imageUrl;
  return {
    id: banner._id.toString(),
    title: banner.title,
    subtitle: banner.subtitle,
    description: banner.description,
    thumbnail,
    imageUrl: thumbnail,
    mobileImageUrl: banner.mobileImageUrl,
    ctaText: banner.ctaText,
    ctaLink: banner.ctaLink,
    contentId: banner.contentId?._id?.toString(),
    content: content ? mapContentItem(content, content.type || banner.contentType || 'series', episodeCount, firstEpisode, likeCount, isLikedByUser) : undefined,
    type: banner.type,
    contentType: banner.contentType,
    position: banner.position,
    isActive: banner.isActive,
    targetPlatforms: banner.targetPlatforms || [],
    startDate: banner.startDate,
    endDate: banner.endDate,
  };
};

// Helper function: Fallback sections (only if no sections in DB)
const getFallbackSections = (tab: 'drama' | 'movie') => {
  const fallbacks = {
    drama: [
      { key: 'top-10-story-tv', title: 'Top 10 on Story TV', category: 'Top 10', sortBy: { views: -1 }, limit: 10, layout: 'horizontal' },
      { key: 'just-launched', title: 'Just Launched', category: 'Recently Added', filter: { isNewContent: true }, sortBy: { createdAt: -1 }, limit: 10, layout: 'horizontal' },
      { key: 'trending-dramas', title: 'Trending Dramas', category: 'Trending', filter: { trending: true }, sortBy: { views: -1 }, limit: 10, layout: 'vertical' },
      { key: 'featured-dramas', title: 'Featured Dramas', category: 'Featured', filter: { featured: true }, sortBy: { createdAt: -1 }, limit: 10, layout: 'grid-2' },
    ],
    movie: [
      { key: 'featured', title: 'Featured', category: 'Featured', filter: { featured: true }, sortBy: { createdAt: -1 }, limit: 10, layout: 'horizontal' },
      { key: 'top-movies', title: 'Top Movies', category: 'Top Rated', sortBy: { views: -1 }, limit: 10, layout: 'vertical' },
    ],
  };
  return fallbacks[tab];
};

// Get home page data
export const getHomePage = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const query = request.query as {
      platform?: 'web' | 'mobile' | 'tv';
      tab?: 'drama' | 'movie';
      limit?: string;
    };

    const platform = query.platform || 'mobile';
    const tab = query.tab || 'drama';
    const limit = Math.min(20, Math.max(1, Number(query.limit || 10)));
    const now = new Date();
    
    const userId = getOptionalUserId(request);

    // Get user's preferred language (defaulting to Hindi if skipped/not set)
    let preferredLanguage = 'Hindi';
    if (userId) {
      const user = await UserModel.findById(userId).select('preferredLanguage languageSelectionSkipped').lean();
      if (user) {
        if (user.preferredLanguage) {
          preferredLanguage = user.preferredLanguage;
        } else if (user.languageSelectionSkipped) {
          preferredLanguage = 'Hindi';
        }
      }
    }

    // Lookup corresponding Language document ObjectId
    let targetLanguageId: mongoose.Types.ObjectId | null = null;
    if (preferredLanguage) {
      const langDoc = await LanguageModel.findOne({ name: new RegExp(`^${preferredLanguage}$`, 'i') }).lean();
      if (langDoc) {
        targetLanguageId = langDoc._id as mongoose.Types.ObjectId;
      }
    }

    // Get sections from database, or fallback to default
    const dbSections = await SectionModel.find({ 
      contentType: tab, isActive: true })
      .select('key title category contentType sortBy limit position isActive layout showViewAll itemType filter contentSelection manualContentIds')
      .sort({ position: 1 })
      .lean();
    let sectionsToFetch = dbSections.length > 0 ? dbSections : getFallbackSections(tab);

    // Fetch banners for the current tab
    const banners = await BannerModel.find({
      isActive: true,
      targetPlatforms: platform,
      contentType: tab, // Strictly match the tab to prevent mixing movies and dramas
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] },
      ],
    })
      .populate('contentId')
      .sort({ position: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    // Fetch content for each section
    const sectionPromises = sectionsToFetch.map(async (section) => {
      let content: any[] = [];
      const manualIds = (section as any).manualContentIds || [];
      const hasManual = manualIds.length > 0;

      const buildFilter = (base: any) => {
        if ((section as any).contentSelection === 'manual') {
          return hasManual ? { ...base, _id: { $in: manualIds } } : null;
        } else if ((section as any).contentSelection === 'mixed' && hasManual) {
          return {
            $or: [
              { ...base, ...(section.filter || {}) },
              { ...base, _id: { $in: manualIds } }
            ]
          };
        } else {
          return { ...base, ...(section.filter || {}) };
        }
      };

      if (tab === 'drama') {
        const baseFilter: any = { type: 'series', status: 'published', contentType: 'drama' };
        if (targetLanguageId) {
          baseFilter.languages = targetLanguageId;
        }
        
        const filter = buildFilter(baseFilter);
        if (filter) {
          content = await ContentModel.find(filter)
            .sort(section.sortBy)
            .limit(section.limit)
            .lean();
        }

        // Fallback if no matching language content
        if (content.length === 0 && targetLanguageId) {
          const fallbackBase = { type: 'series', status: 'published', contentType: 'drama' };
          const fallbackFilter = buildFilter(fallbackBase);
          if (fallbackFilter) {
            content = await ContentModel.find(fallbackFilter)
              .sort(section.sortBy)
              .limit(section.limit)
              .lean();
          }
        }
      } else {
        const baseFilter: any = { status: 'published' };
        if (targetLanguageId) {
          baseFilter.languages = targetLanguageId;
        }
        
        const filter = buildFilter(baseFilter);
        if (filter) {
          content = await MovieModel.find(filter)
            .sort(section.sortBy)
            .limit(section.limit)
            .lean();
        }

        // Fallback if no matching language content
        if (content.length === 0 && targetLanguageId) {
          const fallbackBase = { status: 'published' };
          const fallbackFilter = buildFilter(fallbackBase);
          if (fallbackFilter) {
            content = await MovieModel.find(fallbackFilter)
              .sort(section.sortBy)
              .limit(section.limit)
              .lean();
          }
        }
      }
      return { ...section, content };
    });

    const sectionsWithContent = await Promise.all(sectionPromises);

    // ── Fetch Continue Watching Progress ──────────────────────────────────────
    let watchProgressList: any[] = [];
    if (userId) {
      watchProgressList = await UserWatchProgressModel.find({
        userId,
        contentModelType: tab === 'movie' ? 'Movie' : 'Content',
      })
        .sort({ lastWatchedAt: -1 })
        .limit(10)
        .populate('episodeId')
        .lean();
    }

    // ── Aggregate Data (Episodes & Likes) ─────────────────────────────────────
    
    // Collect all content IDs from banners, sections, and watch progress
    const allContentIdsSet = new Set<string>();
    banners.forEach(b => { if (b.contentId) allContentIdsSet.add(b.contentId._id.toString()); });
    sectionsWithContent.forEach(s => s.content.forEach(c => allContentIdsSet.add(c._id.toString())));
    watchProgressList.forEach(p => { if (p.contentId) allContentIdsSet.add(p.contentId.toString()); });
    
    const allContentIds = Array.from(allContentIdsSet).map(id => new mongoose.Types.ObjectId(id));

    let firstEpisodeMap = new Map<string, any>();
    let episodeCountMap = new Map<string, number>();

    if (tab === 'drama' && allContentIds.length > 0) {
      // Get S1E1 for previews
      const firstEpisodes = await EpisodeModel.aggregate([
        {
          $match: {
            contentId: { $in: allContentIds },
            season: 1,
            episode: 1,
            processingStatus: 'ready',
          },
        },
        { $sort: { season: 1, episode: 1 } },
      ]);
      firstEpisodes.forEach(e => firstEpisodeMap.set(e.contentId.toString(), e));

      // Get episode counts
      const episodeCounts = await EpisodeModel.aggregate([
        { $match: { contentId: { $in: allContentIds } } },
        { $group: { _id: '$contentId', count: { $sum: 1 } } },
      ]);
      episodeCounts.forEach(e => episodeCountMap.set(e._id.toString(), e.count));
    }

    // Get user likes
    const likedContentIdSet = new Set<string>();
    if (userId && allContentIds.length > 0) {
      const userLikes = await UserLikeModel.find({
        userId,
        contentId: { $in: allContentIds },
      }).select('contentId').lean();
      userLikes.forEach(l => likedContentIdSet.add(l.contentId.toString()));
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    // Map banners
    const mappedBanners = banners.map(banner => {
      if (!banner.contentId) return mapBanner(banner);
      
      const cid = (banner.contentId as any)._id.toString();
      const likeCount = (banner.contentId as any).likes || 0;
      const isLikedByUser = likedContentIdSet.has(cid);
      const episodeCount = episodeCountMap.get(cid) || 0;
      const firstEpisode = firstEpisodeMap.get(cid);
      
      return mapBanner(banner, episodeCount, firstEpisode, likeCount, isLikedByUser);
    });

    // Map sections
    const mappedSections = sectionsWithContent.map(section => ({
      key: section.key,
      title: section.title,
      category: section.category,
      layout: section.layout || 'horizontal',
      showViewAll: section.showViewAll !== false,
      itemType: section.itemType || 'poster',
      shows: section.content.map((item: any) => {
        const cid = item._id.toString();
        const likeCount = item.likes || 0;
        const isLikedByUser = likedContentIdSet.has(cid);

        if (tab === 'drama') {
          const episodeCount = episodeCountMap.get(cid) || 0;
          const firstEpisode = firstEpisodeMap.get(cid);
          return mapContentItem(item, 'drama', episodeCount, firstEpisode, likeCount, isLikedByUser);
        } else {
          return mapContentItem(item, 'movie', 0, undefined, likeCount, isLikedByUser);
        }
      }),
    }));

    // Map Continue Watching section
    const continueWatchingShows: any[] = [];
    if (watchProgressList.length > 0) {
      const contentIds = watchProgressList.map(p => p.contentId);
      let items: any[] = [];
      if (tab === 'movie') {
        items = await MovieModel.find({ _id: { $in: contentIds } }).lean();
      } else {
        items = await ContentModel.find({ _id: { $in: contentIds } }).lean();
      }

      const itemsMap = new Map<string, any>();
      items.forEach(item => itemsMap.set(item._id.toString(), item));

      for (const progress of watchProgressList) {
        const item = itemsMap.get(progress.contentId.toString());
        if (!item) continue;

        const cid = item._id.toString();
        const likeCount = item.likes || 0;
        const isLikedByUser = likedContentIdSet.has(cid);

        let mapped: any;
        if (tab === 'drama') {
          const episodeCount = episodeCountMap.get(cid) || 0;
          const firstEpisode = firstEpisodeMap.get(cid);
          mapped = mapContentItem(item, 'drama', episodeCount, firstEpisode, likeCount, isLikedByUser);
        } else {
          mapped = mapContentItem(item, 'movie', 0, undefined, likeCount, isLikedByUser);
        }

        // Inject watch progress detail
        mapped.watchProgress = {
          progressSeconds: progress.progressSeconds,
          durationSeconds: progress.durationSeconds,
          progressPercent: progress.progressPercent,
          lastWatchedAt: progress.lastWatchedAt,
          episodeId: progress.episodeId ? (progress.episodeId as any)._id?.toString() : null,
          episodeNumber: progress.episodeId ? (progress.episodeId as any).episode : null,
          season: progress.episodeId ? (progress.episodeId as any).season : null,
          episodeTitle: progress.episodeId ? (progress.episodeId as any).title : null,
        };

        continueWatchingShows.push(mapped);
      }
    }

    if (continueWatchingShows.length > 0) {
      mappedSections.unshift({
        key: 'continue-watching',
        title: 'Continue Watching',
        category: 'Continue Watching',
        layout: 'horizontal',
        showViewAll: false,
        itemType: 'poster',
        shows: continueWatchingShows,
      });
    }

    return reply.send({
      success: true,
      data: {
        tab,
        banners: mappedBanners,
        sections: mappedSections,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Error getting home page data');
    return reply.status(500).send({ success: false, message: 'Internal server error', error: error.message });
  }
};
