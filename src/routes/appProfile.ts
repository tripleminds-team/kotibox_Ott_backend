import type { FastifyPluginAsync } from 'fastify';
import { getAppProfile, updateVideoQuality, updatePreferredLanguage, deleteAppAccount } from '../controllers/appProfileController';

const appProfileRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/app/profile
  fastify.get('/profile', getAppProfile);

  // PUT /api/app/profile/video-quality
  fastify.put('/profile/video-quality', updateVideoQuality);

  // PUT /api/app/profile/language
  fastify.put('/profile/language', updatePreferredLanguage);

  // DELETE /api/app/profile
  fastify.delete('/profile', deleteAppAccount);
};

export default appProfileRoutes;
