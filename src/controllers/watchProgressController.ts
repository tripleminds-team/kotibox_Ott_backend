import type { FastifyReply, FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { UserWatchProgressModel } from '../models/UserWatchProgress';
import { MovieModel } from '../models/Movie';
import { ContentModel } from '../models/Content';
import { EpisodeModel } from '../models/Episode';
import { logger } from '../lib/logger';

export const saveWatchProgress = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized.' });
    }

    const body = (request.body || {}) as {
      contentId?: string;
      episodeId?: string;
      progressSeconds?: number;
      durationSeconds?: number;
    };
    const { contentId, episodeId, progressSeconds, durationSeconds } = body;

    if (!contentId || progressSeconds === undefined || durationSeconds === undefined) {
      return reply.status(400).send({ success: false, message: 'contentId, progressSeconds, and durationSeconds are required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return reply.status(400).send({ success: false, message: 'Invalid contentId.' });
    }

    if (episodeId && !mongoose.Types.ObjectId.isValid(episodeId)) {
      return reply.status(400).send({ success: false, message: 'Invalid episodeId.' });
    }

    // Determine if Movie or Drama (Content)
    let contentModelType: 'Movie' | 'Content';
    const movieDoc = await MovieModel.findById(contentId).lean();
    if (movieDoc) {
      contentModelType = 'Movie';
    } else {
      const contentDoc = await ContentModel.findById(contentId).lean();
      if (contentDoc) {
        contentModelType = 'Content';
      } else {
        return reply.status(404).send({ success: false, message: 'Content or Movie not found.' });
      }
    }

    // If episodeId is provided, make sure the episode exists and belongs to the content
    if (episodeId) {
      const episodeDoc = await EpisodeModel.findOne({ _id: episodeId, contentId }).lean();
      if (!episodeDoc) {
        return reply.status(404).send({ success: false, message: 'Episode not found for this content.' });
      }
    }

    const filter = {
      userId: new mongoose.Types.ObjectId(userId),
      contentId: new mongoose.Types.ObjectId(contentId),
      episodeId: episodeId ? new mongoose.Types.ObjectId(episodeId) : null,
    };

    const percent = Math.min(100, Math.max(0, Math.round((progressSeconds / durationSeconds) * 100)));
    const isNearlyCompleted = percent > 95 || (durationSeconds - progressSeconds) <= 10;

    if (isNearlyCompleted) {
      await UserWatchProgressModel.deleteOne(filter);
      return reply.send({
        success: true,
        message: 'Watch progress cleared because the content is nearly completed.',
        data: {
          cleared: true,
          progressPercent: percent,
        },
      });
    }

    const progressDoc = await UserWatchProgressModel.findOneAndUpdate(
      filter,
      {
        contentModelType,
        progressSeconds,
        durationSeconds,
        progressPercent: percent,
        lastWatchedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    return reply.send({
      success: true,
      data: progressDoc,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error saving watch progress');
    return reply.status(500).send({
      success: false,
      message: 'Failed to save watch progress.',
      error: error.message,
    });
  }
};

export const clearWatchProgress = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized.' });
    }

    const { contentId } = request.params as { contentId: string };
    const query = request.query as { episodeId?: string };

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return reply.status(400).send({ success: false, message: 'Invalid contentId.' });
    }

    const filter: any = {
      userId: new mongoose.Types.ObjectId(userId),
      contentId: new mongoose.Types.ObjectId(contentId),
    };

    if (query.episodeId) {
      if (!mongoose.Types.ObjectId.isValid(query.episodeId)) {
        return reply.status(400).send({ success: false, message: 'Invalid episodeId.' });
      }
      filter.episodeId = new mongoose.Types.ObjectId(query.episodeId);
    }

    const deleteResult = await UserWatchProgressModel.deleteMany(filter);

    return reply.send({
      success: true,
      message: 'Watch progress cleared successfully.',
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error clearing watch progress');
    return reply.status(500).send({
      success: false,
      message: 'Failed to clear watch progress.',
      error: error.message,
    });
  }
};

export const getWatchHistory = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized.' });
    }

    const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
    const skip = (Number(page) - 1) * Number(limit);

    const history = await UserWatchProgressModel.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ lastWatchedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('contentId', 'title thumbnail posterImage type badge duration') // for movies/shows
      .populate('episodeId', 'title thumbnail episode season duration')
      .lean();

    const total = await UserWatchProgressModel.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });

    // Format the items 
    const items = history.map((h: any) => {
      // Avoid breaking if content was deleted
      if (!h.contentId) return null;
      
      return {
        id: h._id.toString(),
        contentId: h.contentId?._id?.toString(),
        episodeId: h.episodeId?._id?.toString() || null,
        contentType: h.contentModelType.toLowerCase(),
        title: h.episodeId ? h.episodeId.title : h.contentId.title,
        showTitle: h.episodeId ? h.contentId.title : null,
        thumbnail: h.episodeId?.thumbnail || h.contentId.thumbnail || h.contentId.posterImage,
        season: h.episodeId?.season || null,
        episode: h.episodeId?.episode || null,
        progressPercent: h.progressPercent,
        progressSeconds: h.progressSeconds,
        durationSeconds: h.durationSeconds,
        lastWatchedAt: h.lastWatchedAt,
        badge: h.contentId.badge || null,
      };
    }).filter(Boolean); // remove any nulls from deleted content

    return reply.send({
      success: true,
      data: {
        items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error: any) {
    logger.error({ error }, 'Error fetching watch history');
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch watch history.',
      error: error.message,
    });
  }
};

export const deleteWatchHistoryItem = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized.' });
    }

    const { id } = request.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return reply.status(400).send({ success: false, message: 'Invalid history ID.' });
    }

    const deleteResult = await UserWatchProgressModel.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (deleteResult.deletedCount === 0) {
      return reply.status(404).send({ success: false, message: 'Watch history item not found or unauthorized.' });
    }

    return reply.send({
      success: true,
      message: 'Watch history item deleted successfully.'
    });

  } catch (error: any) {
    logger.error({ error }, 'Error deleting watch history item');
    return reply.status(500).send({
      success: false,
      message: 'Failed to delete watch history item.',
      error: error.message,
    });
  }
};
