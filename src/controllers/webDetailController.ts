import type { FastifyReply, FastifyRequest } from 'fastify';
import { MovieModel } from '../models/Movie';
import { ContentModel } from '../models/Content';
import { EpisodeModel } from '../models/Episode';
import { logger } from '../lib/logger';

export const getWebDetail = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { contentId } = request.params as { contentId: string };
    const query = request.query as { type?: string };
    const typeHint = query.type; // 'movie' or 'show' or 'drama'

    let item: any;
    let isMovie = false;

    // We don't necessarily know if it's a movie or content just from ID.
    if (typeHint === 'movie') {
      item = await MovieModel.findById(contentId).populate('genres', 'name').populate('cast.actor', 'name avatar').populate('crew.director', 'name').lean();
      isMovie = true;
    } else if (typeHint === 'show' || typeHint === 'drama') {
      item = await ContentModel.findById(contentId).populate('genres', 'name').populate('cast.actor', 'name avatar').populate('crew.director', 'name').lean();
    } else {
      // Try movie first
      item = await MovieModel.findById(contentId).populate('genres', 'name').populate('cast.actor', 'name avatar').populate('crew.director', 'name').lean();
      if (item) {
        isMovie = true;
      } else {
        item = await ContentModel.findById(contentId).populate('genres', 'name').populate('cast.actor', 'name avatar').populate('crew.director', 'name').lean();
      }
    }

    if (!item) {
      return reply.status(404).send({ success: false, message: 'Content not found' });
    }

    // Map the basic content item
    const type = isMovie ? 'movie' : 'show';
    const mappedItem = {
      id: item._id.toString(),
      title: item.title,
      poster: item.posterImage || item.thumbnail || '',
      backdrop: item.bannerImage || item.thumbnail || '',
      type,
      year: item.year?.toString() || new Date(item.createdAt).getFullYear().toString(),
      duration: item.duration ? `${item.duration}m` : '120m',
      imdbRating: item.imdbRating?.toString() || (item.rating || '8.0'),
      ageRating: item.ageRating ? `${item.ageRating}+` : 'U/A 13+',
      description: item.description || item.shortDescription || '',
      language: item.languages && item.languages.length > 0 ? 'Multi' : 'EN',
      genres: (item.genres || []).map((g: any) => g?.name || g),
      seasons: type === 'show' ? item.seasons || 1 : undefined,
      trailerUrl: item.trailerUrl,
      videoUrl: isMovie ? (item.hlsUrl || item.videoUrl) : undefined,
      cast: (item.cast || []).map((c: any) => ({ name: c.actor?.name, character: c.character, avatar: c.actor?.avatar })),
      directors: (item.crew || []).filter((c: any) => c.role === 'Director').map((c: any) => c.director?.name),
    };

    let episodes: any[] = [];
    if (!isMovie) {
      const eps = await EpisodeModel.find({ contentId: item._id, processingStatus: 'ready' })
        .sort({ season: 1, episode: 1 })
        .select('title description thumbnail hlsUrl duration season episode isFree')
        .lean();
      episodes = eps.map((e: any) => ({
        id: e._id.toString(),
        title: e.title,
        description: e.description,
        thumbnail: e.thumbnail,
        videoUrl: e.hlsUrl,
        duration: e.duration ? `${e.duration}m` : '0m',
        season: e.season,
        episode: e.episode,
        isFree: e.isFree,
      }));
    }

    // Fetch related content (same primary genre)
    let related: any[] = [];
    if (item.genres && item.genres.length > 0) {
      const primaryGenreId = item.genres[0]._id;
      const Model = (isMovie ? MovieModel : ContentModel) as any;
      const relatedRaw = await Model.find({ genres: primaryGenreId, _id: { $ne: item._id }, status: 'published' })
        .sort({ views: -1 })
        .limit(5)
        .select('title thumbnail posterImage bannerImage year rating ageRating duration imdbRating isNewContent featured trending views createdAt')
        .lean();
      
      related = relatedRaw.map((r: any) => ({
        id: r._id.toString(),
        title: r.title,
        poster: r.posterImage || r.thumbnail || '',
        type,
        year: r.year?.toString() || new Date(r.createdAt).getFullYear().toString(),
        duration: r.duration ? `${r.duration}m` : '120m',
        imdbRating: r.imdbRating?.toString() || (r.rating || '8.0'),
        ageRating: r.ageRating ? `${r.ageRating}+` : 'U/A 13+',
      }));
    }

    return reply.send({
      success: true,
      data: {
        ...mappedItem,
        episodes,
        related,
      },
    });

  } catch (error: any) {
    logger.error({ error }, 'Error fetching web detail API data');
    return reply.status(500).send({ success: false, message: 'Internal server error', error: error.message });
  }
};
