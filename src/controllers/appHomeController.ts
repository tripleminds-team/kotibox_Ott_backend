import type { FastifyReply, FastifyRequest } from 'fastify';
import { BannerModel } from '../models/Banner';
import { MovieModel } from '../models/Movie';
import { ContentModel } from '../models/Content';
import { EpisodeModel } from '../models/Episode';
import { SectionModel } from '../models/Section';
import { logger } from '../lib/logger';

// Helper function to map content items
const mapContentItem = (item: any, type: string, episodeCount = 0) => ({
  id: item._id.toString(),
  title: item.title,
  description: item.description,
  shortDescription: item.shortDescription,
  thumbnail: item.thumbnail,
  bannerImage: item.bannerImage,
  type,
  episodeCount,
  genres: item.genres,
  languages: item.languages,
  views: item.views || 0,
  likes: item.likes || 0,
  shares: item.shares || 0,
  featured: item.featured,
  trending: item.trending,
  isNewContent: item.isNewContent,
  rating: item.rating,
  year: item.year,
  duration: item.duration,
  status: item.status,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

// Helper function to map banner
const mapBanner = (banner: any, episodeCount = 0) => {
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
    content: content ? mapContentItem(content, content.type, episodeCount) : undefined,
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
      { key: 'top-10-story-tv', title: 'Top 10 on Story TV', sortBy: { views: -1 }, limit: 10, layout: 'horizontal' },
      { key: 'just-launched', title: 'Just Launched', filter: { isNewContent: true }, sortBy: { createdAt: -1 }, limit: 10, layout: 'horizontal' },
      { key: 'trending-dramas', title: 'Trending Dramas', filter: { trending: true }, sortBy: { views: -1 }, limit: 10, layout: 'vertical' },
      { key: 'featured-dramas', title: 'Featured Dramas', filter: { featured: true }, sortBy: { createdAt: -1 }, limit: 10, layout: 'grid-2' },
    ],
    movie: [
      { key: 'featured', title: 'Featured', filter: { featured: true }, sortBy: { createdAt: -1 }, limit: 10, layout: 'horizontal' },
      { key: 'top-movies', title: 'Top Movies', sortBy: { views: -1 }, limit: 10, layout: 'vertical' },
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

    // Get sections from database, or fallback to default
    const dbSections = await SectionModel.find({ 
      contentType: tab, isActive: true }).sort({ position: 1 });
    let sectionsToFetch = dbSections.length > 0 ? dbSections : getFallbackSections(tab);

    // Fetch banners for the current tab
    const banners = await BannerModel.find({
      isActive: true,
      targetPlatforms: platform,
      contentType: { $in: [tab, 'both'] },
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
      let content;
      if (tab === 'drama') {
        // Get short dramas (series type)
        const filter: any = { type: 'series', status: 'published', contentType: 'drama', ...section.filter };
        content = await ContentModel.find(filter)
          .sort(section.sortBy)
          .limit(section.limit)
          .lean();
      } else {
        // Get movies
        const filter: any = { status: 'published', ...section.filter };
        content = await MovieModel.find(filter)
          .sort(section.sortBy)
          .limit(section.limit)
          .lean();
      }
      return { ...section, content };
    });

    const sectionsWithContent = await Promise.all(sectionPromises);

    // Get episode counts for drama content
    let countMap = new Map();
    if (tab === 'drama') {
      const allDramaContentIds = sectionsWithContent.flatMap(s => s.content.map(c => c._id));
      const episodeCounts = await EpisodeModel.aggregate([
        { $match: { contentId: { $in: allDramaContentIds } } },
        { $group: { _id: '$contentId', count: { $sum: 1 } } },
      ]);
      countMap = new Map(episodeCounts.map(item => [item._id.toString(), item.count]));
    }

    // Get episode counts for banners
    const bannerContentIds = banners.map(b => b.contentId?._id).filter(Boolean);
    const bannerEpisodeCounts = await EpisodeModel.aggregate([
      { $match: { contentId: { $in: bannerContentIds } } },
      { $group: { _id: '$contentId', count: { $sum: 1 } } },
    ]);
    const bannerCountMap = new Map(bannerEpisodeCounts.map(item => [item._id.toString(), item.count]));

    // Map banners
    const mappedBanners = banners.map(banner => 
      mapBanner(banner, banner.contentId ? bannerCountMap.get(banner.contentId._id.toString()) || 0 : 0)
    );

    // Map sections
    const mappedSections = sectionsWithContent.map(section => ({
      key: section.key,
      title: section.title,
      layout: section.layout || 'horizontal',
      showViewAll: section.showViewAll !== false,
      itemType: section.itemType || 'poster',
      shows: section.content.map((item: any) => {
        if (tab === 'drama') {
          return mapContentItem(item, 'drama', countMap.get(item._id.toString()) || 0);
        } else {
          return {
            ...mapContentItem(item, 'movie'),
            id: item._id.toString(),
          };
        }
      }),
    }));

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
