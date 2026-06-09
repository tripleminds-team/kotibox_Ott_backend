import type { FastifyPluginAsync } from 'fastify';
import {
  listPromotions,
  getPromotion,
  getActivePromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '../controllers/promotionController';

const promotionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/promotions', listPromotions);
  fastify.get('/promotions/active', getActivePromotion);
  fastify.get('/promotions/:id', getPromotion);
  fastify.post('/promotions', createPromotion);
  fastify.put('/promotions/:id', updatePromotion);
  fastify.delete('/promotions/:id', deletePromotion);
};

export default promotionsRoutes;
