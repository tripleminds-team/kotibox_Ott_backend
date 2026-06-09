
import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middlewares/auth';
import { login, getMe } from '../controllers/authController';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/auth/login', login);
  fastify.get('/auth/me', { onRequest: [authenticate] }, getMe);
};

export default authRoutes;

