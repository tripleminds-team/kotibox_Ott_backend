import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserModel } from '../models/User';
import { ContentModel } from '../models/Content';
import { LanguageModel } from '../models/Language';
import { SettingsModel } from '../models/Settings';
import mongoose from 'mongoose';
import { PageModel } from '../models/Page';
import { UserDownloadModel } from '../models/UserDownload';
import { UserWishlistModel } from '../models/UserWishlist';
import { UserLikeModel } from '../models/UserLike';
import { MovieModel } from '../models/Movie';
import { EpisodeModel } from '../models/Episode';
import { logger } from '../lib/logger';

// Optional user lookup helper
const getOptionalUserToken = (request: FastifyRequest): string | null => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
  } catch {
    return null;
  }
};

const getOptionalUserId = (request: FastifyRequest): string | null => {
  try {
    const token = getOptionalUserToken(request);
    if (!token) return null;
    const server = request.server as any;
    const decoded = server.jwt.verify(token) as any;
    return decoded?.id || null;
  } catch {
    return null;
  }
};

// ── GET Profile & Settings ──────────────────────────────────────────────────
export const getAppProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = getOptionalUserId(request);
    
    // 1. Fetch User, Downloads list (limited to 5 items), Wishlist list, and Likes
    let userProfile = null;
    let downloadsList: any[] = [];
    let wishlistList: any[] = [];
    let likesList: any[] = [];

    if (userId) {
      // Cast userId string to ObjectId for all DB queries
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const user = await UserModel.findById(userObjectId).lean();
      if (user) {
        // Calculate user sequential number and dynamically format Display ID
        const userNumber = await UserModel.countDocuments({ _id: { $lte: user._id } });
        const settings = await SettingsModel.findOne().lean();
        const appName = settings?.platformName || 'XOTO';
        const prefix = appName.substring(0, 4).toUpperCase();
        const displayId = `${prefix}${String(userNumber).padStart(4, '0')}`;

        const isActive = user.subscriptionStatus === 'active' && 
                         user.subscriptionPlan !== 'free' && 
                         (!user.subscriptionExpiry || user.subscriptionExpiry > new Date());
        userProfile = {
          id: user._id.toString(),
          displayId,
          name: user.name,
          phone: user.phone || null,
          email: user.email || null,
          subscription: isActive,
          subscriptionStatus: isActive ? 'active' : 'inactive',
          subscriptionPlan: isActive ? (user.subscriptionPlan || 'free') : 'free',
          videoQuality: user.videoQuality || 'auto',
          preferredLanguage: user.preferredLanguage || 'Hindi',
          accessToken: getOptionalUserToken(request) || null,
        };
      }

      // Query latest 5 downloads (cast userId to ObjectId)
      const downloads = await UserDownloadModel.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      if (downloads.length > 0) {
        const movieIds = downloads.filter(d => d.contentModelType === 'Movie').map(d => d.contentId);
        const contentIds = downloads.filter(d => d.contentModelType === 'Content').map(d => d.contentId);
        const episodeIds = downloads.filter(d => d.episodeId).map(d => d.episodeId!);

        const [movies, dramas, episodes] = await Promise.all([
          movieIds.length > 0 ? MovieModel.find({ _id: { $in: movieIds } }).select('title thumbnail duration year rating').lean() : Promise.resolve([]),
          contentIds.length > 0 ? ContentModel.find({ _id: { $in: contentIds } }).select('title thumbnail').lean() : Promise.resolve([]),
          episodeIds.length > 0 ? EpisodeModel.find({ _id: { $in: episodeIds } }).select('title thumbnail duration season episode').lean() : Promise.resolve([])
        ]);

        const movieMap = new Map(movies.map(m => [m._id.toString(), m]));
        const dramaMap = new Map(dramas.map(d => [d._id.toString(), d]));
        const episodeMap = new Map(episodes.map(e => [e._id.toString(), e]));

        downloadsList = downloads.map(item => {
          const isMovie = item.contentModelType === 'Movie';
          if (isMovie) {
            const m = movieMap.get(item.contentId.toString());
            if (!m) return null;
            return {
              id: item.contentId.toString(),
              downloadId: item._id.toString(),
              contentId: item.contentId.toString(),
              title: m.title,
              thumbnail: m.thumbnail,
              duration: m.duration,
              year: m.year,
              rating: m.rating,
              type: 'movie',
              downloadedAt: item.createdAt
            };
          } else {
            const d = dramaMap.get(item.contentId.toString());
            const e = item.episodeId ? episodeMap.get(item.episodeId.toString()) : null;
            if (!d || !e) return null;
            return {
              id: item.contentId.toString(),
              downloadId: item._id.toString(),
              contentId: item.contentId.toString(),
              episodeId: item.episodeId?.toString(),
              title: e.title,
              parentTitle: d.title,
              thumbnail: e.thumbnail || d.thumbnail,
              duration: e.duration,
              season: e.season,
              episodeNumber: e.episode,
              type: 'drama',
              downloadedAt: item.createdAt
            };
          }
        }).filter(Boolean);
      }

      // Query user's wishlist (cast userId to ObjectId)
      const wishlistItems = await UserWishlistModel.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .lean();

      if (wishlistItems.length > 0) {
        const wMovieIds = wishlistItems.filter(i => i.contentModelType === 'Movie').map(i => i.contentId);
        const wContentIds = wishlistItems.filter(i => i.contentModelType === 'Content').map(i => i.contentId);

        const [wMovies, wContents] = await Promise.all([
          wMovieIds.length > 0 ? MovieModel.find({ _id: { $in: wMovieIds } }).select('title thumbnail bannerImage posterImage year rating duration views type').lean() : Promise.resolve([]),
          wContentIds.length > 0 ? ContentModel.find({ _id: { $in: wContentIds } }).select('title thumbnail bannerImage posterImage year rating duration views type contentType').lean() : Promise.resolve([]),
        ]);

        const wMovieMap = new Map(wMovies.map(m => [m._id.toString(), m]));
        const wContentMap = new Map(wContents.map(c => [c._id.toString(), c]));

        wishlistList = wishlistItems.map(item => {
          const isMovie = item.contentModelType === 'Movie';
          const c: any = isMovie ? wMovieMap.get(item.contentId.toString()) : wContentMap.get(item.contentId.toString());
          if (!c) return null;

          return {
            id: c._id.toString(),
            title: c.title,
            thumbnail: c.thumbnail,
            bannerImage: c.bannerImage || null,
            posterImage: c.posterImage || c.thumbnail || '',
            type: isMovie ? 'movie' : (c.contentType === 'drama' ? 'drama' : 'series'),
            views: c.views || 0,
            year: c.year || null,
            rating: c.rating || null,
            duration: c.duration || null,
            addedAt: item.createdAt
          };
        }).filter(Boolean);
      }

      // Query user's liked content (movies + dramas, cast userId to ObjectId)
      const likedItems = await UserLikeModel.find({ userId: userObjectId, episodeId: null })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      if (likedItems.length > 0) {
        const lMovieIds = likedItems.filter(i => i.contentModelType === 'Movie').map(i => i.contentId);
        const lContentIds = likedItems.filter(i => i.contentModelType === 'Content').map(i => i.contentId);

        const [lMovies, lContents] = await Promise.all([
          lMovieIds.length > 0 ? MovieModel.find({ _id: { $in: lMovieIds } }).select('title thumbnail bannerImage posterImage year rating duration views type').lean() : Promise.resolve([]),
          lContentIds.length > 0 ? ContentModel.find({ _id: { $in: lContentIds } }).select('title thumbnail bannerImage posterImage year rating duration views type contentType').lean() : Promise.resolve([]),
        ]);

        const lMovieMap = new Map(lMovies.map(m => [m._id.toString(), m]));
        const lContentMap = new Map(lContents.map(c => [c._id.toString(), c]));

        likesList = likedItems.map(item => {
          const isMovie = item.contentModelType === 'Movie';
          const c: any = isMovie ? lMovieMap.get(item.contentId.toString()) : lContentMap.get(item.contentId.toString());
          if (!c) return null;
          return {
            id: c._id.toString(),
            title: c.title,
            thumbnail: c.thumbnail,
            bannerImage: c.bannerImage || null,
            posterImage: c.posterImage || c.thumbnail || '',
            type: isMovie ? 'movie' : (c.contentType === 'drama' ? 'drama' : 'series'),
            views: c.views || 0,
            year: c.year || null,
            rating: c.rating || null,
            duration: c.duration || null,
            likedAt: item.createdAt
          };
        }).filter(Boolean);
      }
    } else {
      userProfile = {
        id: null,
        name: 'Guest',
        subscription: false,
        subscriptionStatus: 'inactive',
        subscriptionPlan: 'free',
        videoQuality: 'auto',
        preferredLanguage: 'Hindi',
        accessToken: null,
      };
    }

    // If guest user, fill with actual database content to demonstrate UI
    if (!userId && (downloadsList.length === 0 || wishlistList.length === 0)) {
      const [movies, dramas] = await Promise.all([
        MovieModel.find({ status: 'published' }).limit(2).lean(),
        ContentModel.find({ status: 'published', type: 'series', contentType: 'drama' }).limit(2).lean()
      ]);

      const dramaIds = dramas.map(d => d._id);
      const episodes = dramaIds.length > 0
        ? await EpisodeModel.find({ contentId: { $in: dramaIds } }).lean()
        : [];
      const episodeMap = new Map(episodes.map(e => [e.contentId.toString(), e]));

      if (downloadsList.length === 0) {
        downloadsList = [
          ...movies.map(m => ({
            id: `seed-dl-${m._id}`,
            contentId: m._id.toString(),
            title: m.title,
            thumbnail: m.thumbnail,
            duration: m.duration || null,
            year: m.year || null,
            rating: m.rating || null,
            type: 'movie',
            downloadedAt: new Date()
          })),
          ...dramas.map(d => {
            const ep = episodeMap.get(d._id.toString());
            return {
              id: `seed-dl-${d._id}`,
              contentId: d._id.toString(),
              episodeId: ep ? ep._id.toString() : undefined,
              title: ep ? ep.title : `${d.title} - Episode 1`,
              parentTitle: d.title,
              thumbnail: ep ? ep.thumbnail || d.thumbnail : d.thumbnail,
              duration: ep ? ep.duration || null : null,
              season: ep ? ep.season : 1,
              episodeNumber: ep ? ep.episode : 1,
              type: 'drama',
              downloadedAt: new Date()
            };
          })
        ];
      }

      if (wishlistList.length === 0) {
        wishlistList = [
          ...movies.map(m => ({
            id: m._id.toString(),
            title: m.title,
            thumbnail: m.thumbnail,
            bannerImage: m.bannerImage || null,
            posterImage: m.posterImage || m.thumbnail || '',
            type: 'movie',
            views: m.views || 0,
            year: m.year || null,
            rating: m.rating || null,
            duration: m.duration || null,
            addedAt: new Date()
          })),
          ...dramas.map(d => ({
            id: d._id.toString(),
            title: d.title,
            thumbnail: d.thumbnail,
            bannerImage: d.bannerImage || null,
            posterImage: d.thumbnail || '',
            type: d.contentType === 'drama' ? 'drama' : 'series',
            views: d.views || 0,
            year: d.year || null,
            rating: d.rating || null,
            duration: null,
            addedAt: new Date()
          }))
        ];
      }
    }

    // 2. Trial Offer Banner Data
    const subscriptionOffer = {
      title: 'Trial Offer',
      subtitle: 'View benefits below',
      ctaText: 'Start Trial',
      benefits: [
        { icon: 'unlimited', title: 'Unlimited Access' },
        { icon: 'ads', title: 'Ads Free' },
        { icon: 'hd', title: 'HD Quality' },
        { icon: 'devices', title: 'Multiple Logins' },
      ],
    };

    // 3. Recommendations ("Dramas you might like")
    const recommendationsRaw = await ContentModel.find({
      status: 'published',
      type: 'series',
      contentType: 'drama'
    })
      .sort({ views: -1 })
      .limit(3)
      .lean();

    const recommendations = recommendationsRaw.map(r => ({
      id: r._id.toString(),
      title: r.title,
      thumbnail: r.thumbnail,
      views: r.views || 0,
      type: 'drama'
    }));

    // 4. App Links / Pages — resolve real slugs from DB
    const pages = await PageModel.find({ status: 'published' }).lean();

    // Helper: build full API URL if slug exists in DB, otherwise null
    const getPageUrl = (slug: string): string | null => {
      const found = pages.find(p => p.slug === slug);
      const baseUrl = `${request.protocol}://${request.headers.host || request.hostname}`;
      return found ? `${baseUrl}/api/pages/${found.slug}` : null;
    };

    // Fetch platform/contact info from settings
    const dbSettings = await SettingsModel.findOne().lean();
    const platformName = dbSettings?.platformName || 'Kotibox';
    const contactEmail = dbSettings?.mailFrom || dbSettings?.mailEmail || 'support@kotibox.com';
    const shareAppText = `Watch amazing short dramas and movies on ${platformName}!`;

    const baseUrl = `${request.protocol}://${request.headers.host || request.hostname}`;

    const appSettings = {
      shareAppTitle: 'Share the App',
      shareAppText,
      shareAppUrl: 'https://play.google.com/store/apps/details?id=com.xoto.ott',
      links: [
        {
          title: 'Privacy Policy',
          url: getPageUrl('privacy-policy') || `${baseUrl}/api/pages/privacy-policy`
        },
        {
          title: 'Terms & Conditions',
          url: getPageUrl('terms-of-service') || `${baseUrl}/api/pages/terms-of-service`
        },
        {
          title: 'Contact Us',
          url: getPageUrl('contact') || `mailto:${contactEmail}`
        },
        {
          title: 'Help Center',
          url: getPageUrl('help') || `${baseUrl}/api/pages/help`
        },
      ],
      appVersion: 'V1.2.4',
    };

    // Fetch all active languages for the profile page
    const languages = await LanguageModel.find({ isActive: true }).sort({ order: 1 }).select('id name code').lean();

    // 6. Send response
    return reply.send({
      success: true,
      data: {
        user: userProfile,
        subscriptionOffer,
        recommendations,
        appSettings,
        downloads: downloadsList,
        wishlist: wishlistList,
        likes: likesList,
        languages: languages.map(lang => ({
          id: lang._id.toString(),
          name: lang.name,
          code: lang.code
        })),
      }
    });
  } catch (error: any) {
    logger.error({ error }, 'Error getting app profile');
    return reply.status(500).send({ success: false, message: 'Failed to fetch profile' });
  }
};

// ── PUT Video Quality Setting ───────────────────────────────────────────────
export const updateVideoQuality = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = getOptionalUserId(request);
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }

    const { videoQuality } = (request.body || {}) as { videoQuality?: 'auto' | 'best' | 'data_saver' };
    
    if (!videoQuality || !['auto', 'best', 'data_saver'].includes(videoQuality)) {
      return reply.status(400).send({ success: false, message: 'Invalid video quality setting' });
    }

    await UserModel.findByIdAndUpdate(userId, { videoQuality });

    return reply.send({
      success: true,
      message: 'Video quality setting updated successfully',
      data: { videoQuality }
    });
  } catch (error: any) {
    logger.error({ error }, 'Error updating video quality');
    return reply.status(500).send({ success: false, message: 'Failed to update setting' });
  }
};

// ── PUT Preferred Language Setting ──────────────────────────────────────────
export const updatePreferredLanguage = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = getOptionalUserId(request);
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }

    const { language } = (request.body || {}) as { language?: string };
    if (!language || typeof language !== 'string') {
      return reply.status(400).send({ success: false, message: 'Language is required' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return reply.status(404).send({ success: false, message: 'User not found' });
    }

    // Resolve language input robustly
    let resolvedLanguage = language;
    const langDoc = await LanguageModel.findOne({
      $or: [
        { name: new RegExp(`^${language}$`, 'i') },
        { code: language.toLowerCase() },
        ...(mongoose.Types.ObjectId.isValid(language) ? [{ _id: language }] : [])
      ]
    }).lean();
    if (langDoc) {
      resolvedLanguage = langDoc.name;
    }

    user.preferredLanguage = resolvedLanguage;
    user.languageSelectionSkipped = false;
    if (user.profiles && user.profiles.length > 0) {
      user.profiles[0].language = resolvedLanguage;
    }
    await user.save();

    return reply.send({
      success: true,
      message: 'Preferred language updated successfully',
      data: {
        preferredLanguage: user.preferredLanguage,
        languageSelectionSkipped: user.languageSelectionSkipped
      }
    });
  } catch (error: any) {
    logger.error({ error }, 'Error updating preferred language');
    return reply.status(500).send({ success: false, message: 'Failed to update preferred language' });
  }
};
