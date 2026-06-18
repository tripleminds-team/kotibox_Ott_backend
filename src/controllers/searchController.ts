import type { FastifyReply, FastifyRequest } from 'fastify';
import { MovieModel } from '../models/Movie';
import { ContentModel } from '../models/Content';
import { UserModel } from '../models/User';
import { LanguageModel } from '../models/Language';
import { logger } from '../lib/logger';
import mongoose from 'mongoose';

// Helper: try to extract userId from JWT (optional auth)
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

// Unified item mapper
const mapSearchItem = (item: any, type: 'movie' | 'drama' | 'series') => ({
  id: item._id.toString(),
  title: item.title,
  description: item.description,
  shortDescription: item.shortDescription,
  thumbnail: item.thumbnail,
  bannerImage: item.bannerImage,
  posterImage: item.posterImage || item.thumbnail || null,
  type,
  views: item.views || 0,
  rating: item.rating,
  year: item.year,
  duration: item.duration,
  status: item.status,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export const getSearchPage = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const query = request.query as { q?: string };
    const searchTerm = query.q?.trim() || '';

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

    if (!searchTerm) {
      // 1. Initial State: Return Trending Searches & Recommended For You

      // A. Fetch Trending Searches (top viewed/liked titles across movies & dramas)
      const popularMovies = await MovieModel.find({ status: 'published' })
        .sort({ views: -1, likes: -1 })
        .limit(4)
        .select('title')
        .lean();

      const popularDramas = await ContentModel.find({ status: 'published', type: 'series', contentType: 'drama' })
        .sort({ views: -1, likes: -1 })
        .limit(4)
        .select('title')
        .lean();

      // Extract unique titles for trending searches
      const trendingSearchesSet = new Set<string>();
      popularMovies.forEach(m => trendingSearchesSet.add(m.title));
      popularDramas.forEach(d => trendingSearchesSet.add(d.title));
      const trendingSearches = Array.from(trendingSearchesSet).slice(0, 6);

      // B. Fetch Recommended For You (personalized by preferred language)
      // Resolve language ID for movies
      let targetLanguageId: mongoose.Types.ObjectId | null = null;
      if (preferredLanguage) {
        const langDoc = await LanguageModel.findOne({ name: new RegExp(`^${preferredLanguage}$`, 'i') }).lean();
        if (langDoc) {
          targetLanguageId = langDoc._id as mongoose.Types.ObjectId;
        }
      }

      // Fetch recommended movies (language filtered)
      const movieFilter: any = { status: 'published' };
      if (targetLanguageId) movieFilter.languages = targetLanguageId;
      let recMovies = await MovieModel.find(movieFilter)
        .sort({ views: -1, createdAt: -1 })
        .limit(6)
        .lean();

      // Fallback for movies if no match in target language
      if (recMovies.length === 0 && targetLanguageId) {
        recMovies = await MovieModel.find({ status: 'published' })
          .sort({ views: -1, createdAt: -1 })
          .limit(6)
          .lean();
      }

      // Fetch recommended dramas/series (language filtered)
      const dramaFilter: any = { status: 'published', type: 'series' };
      if (preferredLanguage) dramaFilter.languages = preferredLanguage;
      let recDramas = await ContentModel.find(dramaFilter)
        .sort({ views: -1, createdAt: -1 })
        .limit(6)
        .lean();

      // Fallback for dramas if no match in target language
      if (recDramas.length === 0 && preferredLanguage) {
        recDramas = await ContentModel.find({ status: 'published', type: 'series' })
          .sort({ views: -1, createdAt: -1 })
          .limit(6)
          .lean();
      }

      // Merge and map recommendations
      const recommendationsList = [
        ...recMovies.map(m => mapSearchItem(m, 'movie')),
        ...recDramas.map(d => mapSearchItem(d, d.contentType === 'drama' ? 'drama' : 'series'))
      ];

      // Sort recommendations by views to make them look uniform
      recommendationsList.sort((a, b) => b.views - a.views);

      return reply.send({
        success: true,
        data: {
          isQueryEmpty: true,
          trendingSearches,
          recommendations: recommendationsList.slice(0, 12),
        }
      });
    }

    // 2. Active Query State: Perform Search

    const regex = new RegExp(searchTerm, 'i');

    const [matchedMovies, matchedContents] = await Promise.all([
      // Search movies
      MovieModel.find({
        status: 'published',
        $or: [
          { title: regex },
          { originalTitle: regex },
          { description: regex },
          { shortDescription: regex },
          { tags: regex }
        ]
      })
        .limit(20)
        .lean(),

      // Search dramas and TV shows
      ContentModel.find({
        status: 'published',
        $or: [
          { title: regex },
          { originalTitle: regex },
          { description: regex },
          { shortDescription: regex },
          { tags: regex }
        ]
      })
        .limit(20)
        .lean()
    ]);

    const results = [
      ...matchedMovies.map(m => mapSearchItem(m, 'movie')),
      ...matchedContents.map(c => mapSearchItem(c, c.contentType === 'drama' ? 'drama' : 'series'))
    ];

    // Sort search results by views/popularity
    results.sort((a, b) => b.views - a.views);

    return reply.send({
      success: true,
      data: {
        isQueryEmpty: false,
        results
      }
    });

  } catch (error: any) {
    logger.error({ error }, 'Error during search operation');
    return reply.status(500).send({
      success: false,
      message: 'Failed to process search request',
      error: error.message
    });
  }
};
