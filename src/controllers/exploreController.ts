import type { FastifyReply, FastifyRequest } from 'fastify';
import { ContentModel } from '../models/Content';
import { MovieModel } from '../models/Movie';
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
      offset?: string;
      limit?: string;
      sort?: 'new' | 'trending' | 'views' | 'featured';
      contentType?: 'drama' | 'movie';
    };

    const offset = Math.max(0, Number(query.offset || 0));
    const limit = Math.min(10, Math.max(1, Number(query.limit || 1)));
    const sort = query.sort || 'new';
    const contentType = query.contentType || 'drama';

    let sortBy = {};
    let filter: any = { status: 'published' };

    // Add contentType filter for dramas
    if (contentType === 'drama') {
      filter.contentType = 'drama';
    }

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

    const skip = offset;

    // Fetch data based on contentType
    let contents: any[] = [];

    if (contentType === 'movie') {
      // Fetch movies
      contents = await MovieModel.find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .lean();
    } else {
      // Fetch dramas (default)
      contents = await ContentModel.find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .lean();
    }

    logger.info({ contentType, filter, sortBy, offset, limit, contentsLength: contents.length }, 'Explore API query results');

    // Get first episodes for each content (for reels video) - only for dramas
    let firstEpisodeMap = new Map();
    let episodeCountMap = new Map();

    if (contentType === 'drama') {
      const contentIds = contents.map(c => c._id);
      const episodes = await EpisodeModel.aggregate([
        { $match: { contentId: { $in: contentIds }, season: 1, episode: 1, processingStatus: 'ready' } },
        { $sort: { season: 1, episode: 1 } },
      ]);

      episodes.forEach(e => {
        firstEpisodeMap.set(e.contentId.toString(), e);
      });

      // Get episode counts
      const episodeCounts = await EpisodeModel.aggregate([
        { $match: { contentId: { $in: contentIds } } },
        { $group: { _id: '$contentId', count: { $sum: 1 } } },
      ]);

      episodeCounts.forEach(e => {
        episodeCountMap.set(e._id.toString(), e.count);
      });
    }

    // Map the data
    const items = contents.map(content => {
      if (contentType === 'movie') {
        // Map movie item
        return mapContentItem(content, 'movie', 0, undefined);
      } else {
        // Map drama item
        const episodeCount = episodeCountMap.get(content._id.toString()) || 0;
        const firstEpisode = firstEpisodeMap.get(content._id.toString());
        return mapContentItem(content, content.type || 'series', episodeCount, firstEpisode);
      }
    });

    reply.send({
      success: true,
      data: {
        items,
        nextOffset: offset + items.length,
        hasMore: items.length === limit,
      },
    });
  } catch (error: any) {
    logger.error(error, 'Error fetching explore data');
    reply.status(500).send({
      success: false,
      message: 'Failed to fetch explore data',
      error: error.message
    });
  }
};
