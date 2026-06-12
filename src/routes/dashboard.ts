
import type { FastifyPluginAsync } from 'fastify';
import {
  getDashboardStats,
  getRevenueData,
  getNewSubscribersData,
  getMostWatchedData,
  getTopGenresData,
  getReviews,
  getTransactions,
} from '../controllers/dashboardController';

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/dashboard/stats', getDashboardStats);
  fastify.get('/dashboard/revenue', getRevenueData);
  fastify.get('/dashboard/new-subscribers', getNewSubscribersData);
  fastify.get('/dashboard/most-watched', getMostWatchedData);
  fastify.get('/dashboard/top-genres', getTopGenresData);
  fastify.get('/dashboard/reviews', getReviews);
  fastify.get('/dashboard/transactions', getTransactions);
};

export default dashboardRoutes;
