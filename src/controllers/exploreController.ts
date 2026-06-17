import type { FastifyReply, FastifyRequest } from 'fastify';
import { ContentModel } from '../models/Content';
import { EpisodeModel } from '../models/Episode';
import { logger } from '../lib/logger';

// Helper function to map content items
const mapContentItem = (item: any, type: string, episodeCount = 0, firstEpisode?: any) => ({
  id: item._id.toString(),
  title: item.title,
  description: item.description,
  shortDescription: item.shortDescription,
  thumbnail: item.thumbnail,
  bannerImage: item.bannerImage,
  type,
  episodeCount,
  genres: item.genres,
  genresText: item.genres.join(' & '), // For subtitle (like "Romance & Drama")
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
  // Add video info for reels!
  videoUrl: firstEpisode?.hlsUrl || item.hlsUrl,
  trailerUrl: firstEpisode?.trailerUrl || item.trailerUrl,
  firstEpisodeTitle: firstEpisode?.title,
});

// Get explore page data (infinite scroll)
export const getExplore = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const query = request.query as {
      page?: string;
      limit?: string;
      sort?: 'new' | 'trending' | 'views' | 'featured';
    };

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(50, Math.max(5, Number(query.limit || 10)));
    const sort = query.sort || 'new';

    let sortBy = {};
    let filter = { status: 'published', contentType: 'drama' };

    // Determine sorting
    switch (sort) {
      case 'new':
        sortBy = { createdAt: -1 };
        break;
      case 'trending':
        sortBy = { trending: -1, views: -1 };
        // Don't filter by trending flag, just sort by it
        break;
      case 'views':
        sortBy = { views: -1 };
        break;
      case 'featured':
        sortBy = { featured: -1, views: -1 };
        filter = { ...filter, featured: true };
        break;
      default:
        sortBy = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // Fetch total count and data
    const [total, contents] = await Promise.all([
      ContentModel.countDocuments(filter),
      ContentModel.find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    // Get first episodes for each content (for reels video)
    const contentIds = contents.map(c => c._id);
    const episodes = await EpisodeModel.aggregate([
      { $match: { contentId: { $in: contentIds }, season: 1, episode: 1, processingStatus: 'ready' } },
      { $sort: { season: 1, episode: 1 } },
    ]);

    const firstEpisodeMap = new Map();
    episodes.forEach(e => {
      firstEpisodeMap.set(e.contentId.toString(), e);
    });

    // Get episode counts
    const episodeCounts = await EpisodeModel.aggregate([
      { $match: { contentId: { $in: contentIds } } },
      { $group: { _id: '$contentId', count: { $sum: 1 } } },
    ]);

    const episodeCountMap = new Map();
    episodeCounts.forEach(e => {
      episodeCountMap.set(e._id.toString(), e.count);
    });

    // Map the data
    const items = contents.map(content => {
      const episodeCount = episodeCountMap.get(content._id.toString()) || 0;
      const firstEpisode = firstEpisodeMap.get(content._id.toString());
      return mapContentItem(content, content.type || 'series', episodeCount, firstEpisode);
    });

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;

    reply.send({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching explore data:', error);
    reply.status(500).send({
      success: false,
      message: 'Failed to fetch explore data',
    });
  }
};
