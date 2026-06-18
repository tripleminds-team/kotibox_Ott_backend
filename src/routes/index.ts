import type { FastifyPluginAsync } from 'fastify';
import healthRoutes from './health';
import authRoutes from './auth';
import appAuthRoutes from './appAuth';
import usersRoutes from './users';
import languagesRoutes from './languages';
import promotionsRoutes from './promotions';
import bannersRoutes from './banners';
import settingsRoutes from './settings';
import genresRoutes from './genres';
import pagesRoutes from './pages';
import faqsRoutes from './faqs';
import actorsRoutes from './actors';
import directorsRoutes from './directors';
import notificationLogsRoutes from './notificationLogs';
import subscriptionPlansRoutes from './subscriptionPlans';
import planLimitsRoutes from './planLimits';
import subscriptionRoutes from './subscriptions';
import categoriesRoutes from './categories';
import notificationTemplatesRoutes from './notificationTemplates';
import mediaRoutes from './media';
import appSettingsRoutes from './appSettings';
import dashboardRoutes from './dashboard';
import movieRoutes from './movie';
import adminUsersRoutes from './adminUsers';
import sectionsRoutes from './sections';
import contentsRoutes from './contents';
import episodesRoutes from './episodes';
import likeRoutes from './like';
import watchRoutes from './watch';
import shareRoutes from './share';
import wishlistRoutes from './wishlist';
import appProfileRoutes from './appProfile';
import downloadRoutes from './download';
import { getHomePage } from '../controllers/appHomeController';
import { getExplore } from '../controllers/exploreController';
import { getSearchPage } from '../controllers/searchController';
import { getWebHome } from '../controllers/webHomeController';
import { getWebBrowse } from '../controllers/webBrowseController';
import { getWebDetail } from '../controllers/webDetailController';
import { getMovieDetail } from '../controllers/appMovieController';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.register(healthRoutes);
  fastify.register(authRoutes);
  fastify.register(appAuthRoutes);
  fastify.register(usersRoutes);
  fastify.register(languagesRoutes, { prefix: '/languages' });
  fastify.register(promotionsRoutes);
  fastify.register(bannersRoutes);
  fastify.register(settingsRoutes);
  fastify.register(genresRoutes, { prefix: '/genres' });
  fastify.register(pagesRoutes, { prefix: '/pages' });
  fastify.register(faqsRoutes, { prefix: '/faqs' });
  fastify.register(actorsRoutes, { prefix: '/actors' });
  fastify.register(directorsRoutes, { prefix: '/directors' });
  fastify.register(notificationLogsRoutes, { prefix: '/notification-logs' });
  fastify.register(subscriptionPlansRoutes, { prefix: '/subscription-plans' });
  fastify.register(planLimitsRoutes, { prefix: '/plan-limits' });
  fastify.register(subscriptionRoutes);
  fastify.register(categoriesRoutes, { prefix: '/categories' });
  fastify.register(notificationTemplatesRoutes, { prefix: '/notification-templates' });
  fastify.register(mediaRoutes, { prefix: '/media' });
  fastify.register(appSettingsRoutes, { prefix: '/app-settings' });
  fastify.register(dashboardRoutes);
  fastify.register(movieRoutes, { prefix: '/movies' });
  fastify.register(adminUsersRoutes, { prefix: '/admin-users' });
  fastify.register(sectionsRoutes, { prefix: '/sections' });
  fastify.register(contentsRoutes, { prefix: '/contents' });
  fastify.register(episodesRoutes, { prefix: '/episodes' });

  // Like / Unlike route
  fastify.register(likeRoutes);

  // Watch page route (video player + episodes + lock/unlock)
  fastify.register(watchRoutes);

  // Smart Deep Link Share route
  fastify.register(shareRoutes);

  // Wishlist route
  fastify.register(wishlistRoutes);

  // App Profile / Settings route
  fastify.register(appProfileRoutes, { prefix: '/app' });

  // Download routes (POST /download, GET /downloads, DELETE /downloads/:id)
  fastify.register(downloadRoutes, { prefix: '/app' });

  // Mobile movie detail page
  fastify.get('/app/movies/:id', getMovieDetail);

  // Home page route for app
  fastify.get('/home', getHomePage);
  
  // Explore page (infinite scroll)
  fastify.get('/explore', getExplore);

  // Search page (trending keywords + query results)
  fastify.get('/search', getSearchPage);

  // Web Homepage aggregated data
  fastify.get('/web-home', getWebHome);
  
  // Web Browse paginated data
  fastify.get('/web-browse', getWebBrowse);
  
  // Web Detail page data
  fastify.get('/web-detail/:contentId', getWebDetail);
};

export default router;
