import type { FastifyPluginAsync } from 'fastify';
import {
  sendOtp,
  verifyOtp,
  setPreferredLanguage,
  skipPreferredLanguage,
  registerUser,
  loginUser
} from '../controllers/appAuthController';

const appAuthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/app/auth/send-otp', sendOtp);
  fastify.post('/app/auth/verify-otp', verifyOtp);
  fastify.post('/app/auth/register', registerUser);
  fastify.post('/app/auth/login', loginUser);
  
  fastify.post('/app/auth/language/:userId', setPreferredLanguage);
  fastify.post('/app/auth/language/:userId/skip', skipPreferredLanguage);

  // Mobile App compatibility routes
  fastify.post('/app/users/:userId/language', setPreferredLanguage);
  fastify.post('/app/users/:userId/language/skip', skipPreferredLanguage);
};

export default appAuthRoutes;
