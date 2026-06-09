
import type { FastifyPluginAsync } from 'fastify';
import {
  sendOtp,
  setPreferredLanguage,
  skipPreferredLanguage,
  verifyOtp,
} from '../controllers/appAuthController';

const appAuthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/app/auth/send-otp', sendOtp);
  fastify.post('/app/auth/verify-otp', verifyOtp);
  fastify.post('/app/users/:userId/language', setPreferredLanguage);
  fastify.post('/app/users/:userId/language/skip', skipPreferredLanguage);
};

export default appAuthRoutes;
