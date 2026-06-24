import type { FastifyPluginAsync } from 'fastify';
import { saveWatchProgress, clearWatchProgress, getWatchHistory, deleteWatchHistoryItem } from '../controllers/watchProgressController';

const watchProgressRoutes: FastifyPluginAsync = async (fastify) => {
  // Requires authentication
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // POST /api/app/watch/progress - Save/upsert watch progress
  fastify.post('/watch/progress', saveWatchProgress);

  // DELETE /api/app/watch/progress/:contentId - Clear watch progress
  fastify.delete('/watch/progress/:contentId', clearWatchProgress);

  // GET /api/app/watch/history - Get full watch history for the user
  fastify.get('/watch/history', getWatchHistory);

  // DELETE /api/app/watch/history/:id - Delete a specific item from watch history
  fastify.delete('/watch/history/:id', deleteWatchHistoryItem);
};

export default watchProgressRoutes;
