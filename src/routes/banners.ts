import type { FastifyPluginAsync } from 'fastify';
import {
  appendBannerShowVideo,
  createBannerShow,
  deleteBanner,
  getBannerById,
  getBannerShow,
  listBanners,
  updateBanner,
  updateEpisodeLock,
} from '../controllers/bannerController';

const bannersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/banners', listBanners);
  fastify.post('/banners', createBannerShow);
  fastify.get('/banners/item/:bannerId', getBannerById);
  fastify.put('/banners/item/:bannerId', updateBanner);
  fastify.delete('/banners/item/:bannerId', deleteBanner);
  fastify.get('/banners/:contentId', getBannerShow);
  fastify.post('/banners/:contentId/videos', appendBannerShowVideo);
  fastify.patch('/episodes/:episodeId/lock', updateEpisodeLock);
};

export default bannersRoutes;
