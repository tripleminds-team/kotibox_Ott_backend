/**
 * Database seeder — runs once on first connection if collections are empty.
 * Seeds default subscription plans, categories, and sample content.
 */
import bcrypt from 'bcryptjs';
import { logger } from './logger';
import { SubscriptionPlanModel } from '../models/SubscriptionPlan';
import { CategoryModel } from '../models/Category';
import { AdminUserModel } from '../models/AdminUser';
import { ContentModel } from '../models/Content';
import { LanguageModel } from '../models/Language';
import { NotificationTemplateModel } from '../models/NotificationTemplate';
import { NotificationModel } from '../models/Notification';
import { BannerModel } from '../models/Banner';
import { MovieModel } from '../models/Movie';
import { EpisodeModel } from '../models/Episode';

async function seedSubscriptionPlans() {
  const count = await SubscriptionPlanModel.countDocuments();
  if (count > 0) return;

  const plans = [
    {
      name: 'free',
      displayName: 'Free',
      description: 'Limited content with ads. Enjoy our free library.',
      monthlyPrice: 0, quarterlyPrice: 0, annualPrice: 0,
      currency: 'INR',
      features: {
        videoQuality: 'SD' as const, simultaneousScreens: 1,
        downloadAllowed: false, maxDownloads: 0, adsEnabled: true,
        liveTV: false, earlyAccess: false, exclusiveContent: false,
        offlineViewing: false, dolbyAtmos: false, supportPriority: 'standard' as const,
      },
      contentAccess: 'free' as const, isActive: true, isPopular: false,
      trialDays: 0, color: '#6b7280', order: 1,
    },
    {
      name: 'basic',
      displayName: 'Basic',
      description: 'HD streaming on 1 screen. No downloads.',
      monthlyPrice: 149, quarterlyPrice: 399, annualPrice: 1499,
      currency: 'INR',
      features: {
        videoQuality: 'HD' as const, simultaneousScreens: 1,
        downloadAllowed: false, maxDownloads: 0, adsEnabled: false,
        liveTV: false, earlyAccess: false, exclusiveContent: false,
        offlineViewing: false, dolbyAtmos: false, supportPriority: 'standard' as const,
      },
      contentAccess: 'basic' as const, isActive: true, isPopular: false,
      trialDays: 7, color: '#3b82f6', order: 2,
    },
    {
      name: 'standard',
      displayName: 'Standard',
      description: 'Full HD on 2 screens with downloads and Live TV.',
      monthlyPrice: 299, quarterlyPrice: 799, annualPrice: 2999,
      currency: 'INR',
      features: {
        videoQuality: 'FHD' as const, simultaneousScreens: 2,
        downloadAllowed: true, maxDownloads: 25, adsEnabled: false,
        liveTV: true, earlyAccess: false, exclusiveContent: false,
        offlineViewing: true, dolbyAtmos: false, supportPriority: 'priority' as const,
      },
      contentAccess: 'standard' as const, isActive: true, isPopular: true,
      trialDays: 14, color: '#8b5cf6', order: 3,
    },
    {
      name: 'premium',
      displayName: 'Premium',
      description: '4K + Dolby Atmos on 4 screens. Full library access.',
      monthlyPrice: 499, quarterlyPrice: 1299, annualPrice: 4999,
      currency: 'INR',
      features: {
        videoQuality: '4K' as const, simultaneousScreens: 4,
        downloadAllowed: true, maxDownloads: 100, adsEnabled: false,
        liveTV: true, earlyAccess: true, exclusiveContent: true,
        offlineViewing: true, dolbyAtmos: true, supportPriority: 'vip' as const,
      },
      contentAccess: 'premium' as const, isActive: true, isPopular: false,
      trialDays: 14, color: '#e50914', order: 4,
    },
  ];

  await SubscriptionPlanModel.insertMany(plans);
  logger.info('Seeded subscription plans');
}

async function seedCategories() {
  const count = await CategoryModel.countDocuments();
  if (count > 0) return;

  const categories = [
    { name: 'Action', slug: 'action', color: '#ef4444', contentCount: 18, order: 1, isFeatured: true },
    { name: 'Drama', slug: 'drama', color: '#8b5cf6', contentCount: 24, order: 2, isFeatured: true },
    { name: 'Sci-Fi', slug: 'sci-fi', color: '#3b82f6', contentCount: 16, order: 3, isFeatured: true },
    { name: 'Thriller', slug: 'thriller', color: '#f59e0b', contentCount: 21, order: 4, isFeatured: false },
    { name: 'Comedy', slug: 'comedy', color: '#10b981', contentCount: 11, order: 5, isFeatured: false },
    { name: 'Horror', slug: 'horror', color: '#dc2626', contentCount: 9, order: 6, isFeatured: false },
    { name: 'Romance', slug: 'romance', color: '#ec4899', contentCount: 7, order: 7, isFeatured: false },
    { name: 'Crime', slug: 'crime', color: '#6b7280', contentCount: 14, order: 8, isFeatured: false },
    { name: 'Documentary', slug: 'documentary', color: '#0ea5e9', contentCount: 6, order: 9, isFeatured: false },
    { name: 'Sports', slug: 'sports', color: '#22c55e', contentCount: 4, order: 10, isFeatured: false },
  ];

  await CategoryModel.insertMany(categories);
  logger.info('Seeded categories');
}

async function seedLanguages() {
  const count = await LanguageModel.countDocuments();
  if (count > 0) return;

  const languages = [
    { name: "English", code: "en", image: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Flag_of_the_United_States.svg/320px-Flag_of_the_United_States.svg.png", order: 1 },
    { name: "Hindi", code: "hi", image: "https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Flag_of_India.svg/320px-Flag_of_India.svg.png", order: 2 },
    { name: "Tamil", code: "ta", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Flag_of_Tamil_Nadu.svg/320px-Flag_of_Tamil_Nadu.svg.png", order: 3 },
    { name: "Telugu", code: "te", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Flag_of_Andhra_Pradesh.svg/320px-Flag_of_Andhra_Pradesh.svg.png", order: 4 },
    { name: "Kannada", code: "kn", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Flag_of_Karnataka.svg/320px-Flag_of_Karnataka.svg.png", order: 5 },
    { name: "Malayalam", code: "ml", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Flag_of_Kerala.svg/320px-Flag_of_Kerala.svg.png", order: 6 },
    { name: "Marathi", code: "mr", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Flag_of_Maharashtra.svg/320px-Flag_of_Maharashtra.svg.png", order: 7 },
    { name: "Gujarati", code: "gu", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Flag_of_Gujarat.svg/320px-Flag_of_Gujarat.svg.png", order: 8 },
    { name: "Bengali", code: "bn", image: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f9/Flag_of_Bangladesh.svg/320px-Flag_of_Bangladesh.svg.png", order: 9 },
    { name: "Punjabi", code: "pa", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Flag_of_Punjab%2C_India.svg/320px-Flag_of_Punjab%2C_India.svg.png", order: 10 },
  ];

  await LanguageModel.insertMany(languages);
  logger.info('Seeded 10 languages');
}

async function seedAdminUsers() {
  const count = await AdminUserModel.countDocuments();
  if (count > 0) return;

  const [hash1, hash2] = await Promise.all([
    bcrypt.hash('admin123', 12),
    bcrypt.hash('editor123', 12),
  ]);

  const admins = [
    {
      email: 'admin@streamit.com',
      name: 'Admin User',
      passwordHash: hash1,
      role: 'superadmin' as const,
      isActive: true,
    },
    {
      email: 'editor@streamvault.com',
      name: 'Content Editor',
      passwordHash: hash2,
      role: 'moderator' as const,
      isActive: true,
    },
  ];

  await AdminUserModel.insertMany(admins);
  logger.info('Seeded admin users');
}

async function seedSampleContent() {
  await ContentModel.deleteMany({});

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  const content = [
    // Short Dramas (contentType: 'drama', type: 'series')
    {
      title: 'CEO Billionaire',
      type: 'series',
      contentType: 'drama',
      description: 'A powerful CEO falls in love with his assistant, but secrets from his past threaten their future.',
      shortDescription: 'A romantic story of a billionaire and his assistant',
      thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=600&fit=crop&q=80',
      genres: ['Romance', 'Drama'],
      languages: ['Hindi', 'English'],
      subtitleLanguages: ['Hindi', 'English'],
      audioLanguages: ['Hindi'],
      year: 2024,
      rating: 'TV-14',
      ageRating: 13,
      status: 'published',
      hlsUrl: 'https://example.com/hls/ceo-billionaire/master.m3u8',
      views: 5647293,
      likes: 124532,
      shares: 45231,
      featured: false,
      trending: true,
      isNewContent: true,
      isExclusive: true,
      downloadAllowed: true,
      cast: [
        { name: 'Raj Sharma', role: 'Lead Actor', character: 'Arjun Oberoi' },
        { name: 'Priya Patel', role: 'Lead Actress', character: 'Ananya' }
      ],
      crew: [{ name: 'Anil Verma', role: 'Director' }],
      director: 'Anil Verma',
      producer: 'Karan Joshi',
      studio: 'Story TV Originals',
      country: 'India',
      tags: ['billionaire', 'romance', 'office-romance', 'original'],
      imdbRating: 8.9,
      maturityContent: ['Romantic Situations', 'Mild Language'],
      seasons: 2,
      sections: ['ceo-billionaire', 'binge-worthy'],
      planRequired: 'free',
      createdAt: daysAgo(30),
      updatedAt: daysAgo(15),
    },
    {
      title: 'Love Affairs',
      type: 'series',
      contentType: 'drama',
      description: 'Three friends navigate complex relationships and hidden passions in modern Mumbai.',
      shortDescription: 'A tale of love and friendship',
      thumbnail: 'https://images.unsplash.com/photo-1516571748831-5d81767b788d?w=400&h=600&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=1200&h=600&fit=crop&q=80',
      genres: ['Romance', 'Drama'],
      languages: ['Hindi'],
      subtitleLanguages: ['Hindi', 'English'],
      audioLanguages: ['Hindi'],
      year: 2024,
      rating: 'TV-MA',
      ageRating: 17,
      status: 'published',
      hlsUrl: 'https://example.com/hls/love-affairs/master.m3u8',
      views: 3241520,
      likes: 89234,
      shares: 28341,
      featured: false,
      trending: true,
      isNewContent: true,
      isExclusive: false,
      downloadAllowed: true,
      cast: [
        { name: 'Neha Singh', role: 'Lead Actress', character: 'Riya' },
        { name: 'Rahul Mehta', role: 'Lead Actor', character: 'Dev' }
      ],
      crew: [{ name: 'Sneha Kapoor', role: 'Director' }],
      director: 'Sneha Kapoor',
      studio: 'Story TV',
      country: 'India',
      tags: ['love-triangle', 'modern-love', 'drama'],
      imdbRating: 8.4,
      maturityContent: ['Adult Content', 'Strong Language'],
      seasons: 1,
      sections: ['love-affairs', 'story-tv-specials'],
      planRequired: 'free',
      createdAt: daysAgo(45),
      updatedAt: daysAgo(10),
    },
    {
      title: 'Binge Worthy Series',
      type: 'series',
      contentType: 'drama',
      description: 'A gripping thriller that will keep you on the edge of your seat with every episode.',
      shortDescription: 'A thriller you can\'t miss',
      thumbnail: 'https://images.unsplash.com/photo-1478720568477-152d9b164e63?w=400&h=600&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=600&fit=crop&q=80',
      genres: ['Thriller', 'Drama'],
      languages: ['Hindi', 'Tamil'],
      subtitleLanguages: ['Hindi', 'Tamil', 'English'],
      audioLanguages: ['Hindi', 'Tamil'],
      year: 2024,
      rating: 'TV-MA',
      ageRating: 17,
      status: 'published',
      hlsUrl: 'https://example.com/hls/binge-worthy/master.m3u8',
      views: 7241890,
      likes: 214567,
      shares: 67234,
      featured: true,
      trending: true,
      isNewContent: false,
      isExclusive: true,
      downloadAllowed: true,
      cast: [
        { name: 'Vikram Rathod', role: 'Lead Actor', character: 'Inspector Arjun' },
        { name: 'Anita Desai', role: 'Lead Actress', character: 'Maya' }
      ],
      crew: [{ name: 'Rakesh Omprakash', role: 'Director' }],
      director: 'Rakesh Omprakash',
      studio: 'Story TV Originals',
      country: 'India',
      tags: ['thriller', 'crime', 'must-watch'],
      imdbRating: 9.2,
      maturityContent: ['Violence', 'Strong Language'],
      seasons: 3,
      sections: ['binge-worthy', 'top-dramas'],
      planRequired: 'basic',
      createdAt: daysAgo(120),
      updatedAt: daysAgo(20),
    },
    {
      title: 'Story TV Special',
      type: 'series',
      contentType: 'drama',
      description: 'A collection of short stories from the heartland of India, celebrating love and life.',
      shortDescription: 'Heartwarming short stories',
      thumbnail: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=600&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=600&fit=crop&q=80',
      genres: ['Drama', 'Family'],
      languages: ['Hindi', 'Marathi', 'Gujarati'],
      subtitleLanguages: ['Hindi', 'English'],
      audioLanguages: ['Hindi'],
      year: 2024,
      rating: 'TV-PG',
      ageRating: 10,
      status: 'published',
      hlsUrl: 'https://example.com/hls/story-tv-special/master.m3u8',
      views: 1892345,
      likes: 67890,
      shares: 18234,
      featured: false,
      trending: false,
      isNewContent: true,
      isExclusive: true,
      downloadAllowed: false,
      cast: [
        { name: 'Various', role: 'Ensemble Cast' }
      ],
      crew: [{ name: 'Multiple', role: 'Directors' }],
      studio: 'Story TV Originals',
      country: 'India',
      tags: ['family', 'special', 'heartwarming'],
      imdbRating: 8.1,
      maturityContent: [],
      seasons: 1,
      sections: ['story-tv-specials'],
      planRequired: 'free',
      createdAt: daysAgo(15),
      updatedAt: daysAgo(5),
    },
    {
      title: 'Top Drama of All Time',
      type: 'series',
      contentType: 'drama',
      description: 'An epic saga of love, betrayal, and redemption spanning three generations.',
      shortDescription: 'An epic family saga',
      thumbnail: 'https://images.unsplash.com/photo-1460186141667-b3180f76e83b?w=400&h=600&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&h=600&fit=crop&q=80',
      genres: ['Drama', 'Romance'],
      languages: ['Hindi', 'English'],
      subtitleLanguages: ['Hindi', 'English', 'Tamil'],
      audioLanguages: ['Hindi', 'English'],
      year: 2023,
      rating: 'TV-MA',
      ageRating: 17,
      status: 'published',
      hlsUrl: 'https://example.com/hls/top-drama/master.m3u8',
      views: 9876543,
      likes: 345678,
      shares: 123456,
      featured: true,
      trending: true,
      isNewContent: false,
      isExclusive: true,
      downloadAllowed: true,
      cast: [
        { name: 'Amitabh Khan', role: 'Lead Actor', character: 'Raj' },
        { name: 'Deepika Kapoor', role: 'Lead Actress', character: 'Simran' }
      ],
      crew: [{ name: 'Karan Johar', role: 'Director' }],
      director: 'Karan Johar',
      studio: 'Story TV Originals',
      country: 'India',
      tags: ['epic', 'family-saga', 'classic'],
      imdbRating: 9.5,
      maturityContent: ['Adult Themes', 'Violence'],
      seasons: 5,
      sections: ['top-dramas', 'top-10-story-tv', 'binge-worthy'],
      planRequired: 'premium',
      createdAt: daysAgo(365),
      updatedAt: daysAgo(100),
    },
  ];

  await ContentModel.insertMany(content);
  logger.info('Seeded sample short dramas');
}

async function seedMovies() {
  await MovieModel.deleteMany({});

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  const movies = [
    {
      title: 'Neon Prophecy',
      originalTitle: 'Neon Prophecy',
      description: 'In a dystopian megacity, a rogue detective uncovers a conspiracy threatening the last free city on Earth.',
      shortDescription: 'Dystopian sci-fi thriller',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&h=600&fit=crop&q=80',
      posterImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=900&fit=crop&q=80',
      trailerUrl: 'https://example.com/trailer/neon-prophecy.mp4',
      genres: [],
      categories: [],
      languages: [],
      subtitleLanguages: [],
      audioLanguages: [],
      year: 2024,
      rating: 'TV-MA',
      ageRating: 17,
      duration: 7560,
      releaseDate: daysAgo(60),
      status: 'published',
      hlsUrl: 'https://example.com/hls/neon-prophecy/master.m3u8',
      views: 1847293,
      likes: 98765,
      shares: 23456,
      featured: true,
      trending: true,
      isNewContent: true,
      isExclusive: true,
      downloadAllowed: true,
      sections: ['featured', 'trending', 'top-rated'],
      cast: [],
      crew: [],
      director: 'Alex Rivera',
      producer: 'John Smith',
      studio: 'StreamVault Originals',
      country: 'USA',
      tags: ['dystopian', 'cyberpunk', 'original'],
      imdbRating: 8.2,
      maturityContent: ['Violence', 'Strong Language'],
      planRequired: 'free',
      createdAt: daysAgo(90),
      updatedAt: daysAgo(85),
    },
    {
      title: 'The Last Heist',
      originalTitle: 'The Last Heist',
      description: 'A legendary thief comes out of retirement for one final job that goes catastrophically wrong.',
      shortDescription: 'Heist thriller',
      thumbnail: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=600&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e63?w=1200&h=600&fit=crop&q=80',
      posterImage: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=900&fit=crop&q=80',
      genres: [],
      categories: [],
      languages: [],
      subtitleLanguages: [],
      audioLanguages: [],
      year: 2024,
      rating: 'TV-14',
      ageRating: 14,
      duration: 6840,
      releaseDate: daysAgo(45),
      status: 'published',
      hlsUrl: 'https://example.com/hls/the-last-heist/master.m3u8',
      views: 2341120,
      likes: 123456,
      shares: 34567,
      featured: false,
      trending: true,
      isNewContent: true,
      isExclusive: false,
      downloadAllowed: true,
      sections: ['trending', 'top-rated'],
      cast: [],
      crew: [],
      director: 'Sarah Kim',
      imdbRating: 7.8,
      tags: ['heist', 'crime'],
      planRequired: 'free',
      createdAt: daysAgo(60),
      updatedAt: daysAgo(55),
    },
    {
      title: 'Echoes of Tomorrow',
      originalTitle: 'Echoes of Tomorrow',
      description: 'A quantum physicist accidentally fragments the timeline and must repair reality before it collapses.',
      shortDescription: 'Time travel sci-fi',
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&h=600&fit=crop&q=80',
      posterImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=900&fit=crop&q=80',
      genres: [],
      categories: [],
      languages: [],
      subtitleLanguages: [],
      audioLanguages: [],
      year: 2024,
      rating: 'PG-13',
      ageRating: 13,
      duration: 8100,
      releaseDate: daysAgo(10),
      status: 'published',
      views: 123456,
      likes: 45678,
      shares: 12345,
      featured: false,
      trending: false,
      isNewContent: true,
      isExclusive: true,
      downloadAllowed: false,
      sections: ['new-releases'],
      cast: [],
      crew: [],
      imdbRating: 7.5,
      tags: ['time-travel', 'quantum'],
      planRequired: 'standard',
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
    },
  ];

  await MovieModel.insertMany(movies);
  logger.info('Seeded sample movies');
}

async function seedEpisodes() {
  await EpisodeModel.deleteMany({});

  const content = await ContentModel.find().lean();
  if (!content.length) return;

  const episodes = [];
  
  for (const item of content) {
    if (item.type === 'series') {
      const numEpisodes = 10;
      for (let i = 1; i <= numEpisodes; i++) {
        episodes.push({
          contentId: item._id,
          title: `Episode ${i}`,
          description: `Description for episode ${i} of ${item.title}`,
          thumbnail: 'https://images.unsplash.com/photo-1516571748831-5d81767b788d?w=400&h=225&fit=crop&q=80',
          duration: 1200,
          season: 1,
          episode: i,
          isFree: true,
          isLocked: false,
          hlsUrl: `https://example.com/hls/${item.title.toLowerCase().replace(/ /g, '-')}/ep${i}/master.m3u8`,
          views: Math.floor(Math.random() * 1000000),
          downloadAllowed: false,
          subtitleLanguages: [],
          audioLanguages: [],
          processingStatus: 'ready' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  await EpisodeModel.insertMany(episodes);
  logger.info('Seeded sample episodes');
}

async function seedBanners() {
  await BannerModel.deleteMany({});

  const content = await ContentModel.find().lean();
  const movies = await MovieModel.find().lean();

  const allContent = [...content, ...movies];

  const banners = [
    // Both tabs
    {
      title: 'Welcome to Kotibox OTT',
      subtitle: 'Stream the best content',
      description: 'Watch thousands of shows and movies',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=600&fit=crop&q=80',
      mobileImageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=400&fit=crop&q=80',
      ctaText: 'Start Watching',
      ctaLink: '/home',
      contentId: allContent.length > 0 ? allContent[0]._id : undefined,
      type: 'hero',
      contentType: 'both',
      position: 1,
      isActive: true,
      targetPlatforms: ['web', 'mobile', 'tv'],
      backgroundColor: '#000000',
      textColor: '#ffffff',
    },
    // Drama tabs
    {
      title: 'CEO Billionaire',
      subtitle: 'New episodes every week',
      description: 'Watch the latest episodes',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=600&fit=crop&q=80',
      mobileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop&q=80',
      ctaText: 'Watch Now',
      ctaLink: '/show/ceo-billionaire',
      contentId: content.length > 0 ? content[0]._id : undefined,
      type: 'featured',
      contentType: 'drama',
      position: 1,
      isActive: true,
      targetPlatforms: ['web', 'mobile', 'tv'],
    },
    {
      title: 'Love Affairs',
      subtitle: 'Now Streaming',
      description: 'Binge watch all episodes',
      imageUrl: 'https://images.unsplash.com/photo-1516571748831-5d81767b788d?w=1200&h=600&fit=crop&q=80',
      mobileImageUrl: 'https://images.unsplash.com/photo-1516571748831-5d81767b788d?w=800&h=400&fit=crop&q=80',
      ctaText: 'Binge Now',
      type: 'featured',
      contentType: 'drama',
      position: 2,
      isActive: true,
      targetPlatforms: ['web', 'mobile'],
    },
    // Movie tabs
    {
      title: 'Neon Prophecy',
      subtitle: 'StreamVault Original',
      description: 'Watch now',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=600&fit=crop&q=80',
      mobileImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=400&fit=crop&q=80',
      ctaText: 'Play Now',
      contentId: movies.length > 0 ? movies[0]._id : undefined,
      type: 'featured',
      contentType: 'movie',
      position: 1,
      isActive: true,
      targetPlatforms: ['web', 'mobile', 'tv'],
    },
    {
      title: 'New Movies',
      subtitle: 'Check out latest releases',
      description: 'Fresh movies every month',
      imageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&h=600&fit=crop&q=80',
      mobileImageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=400&fit=crop&q=80',
      ctaText: 'Explore',
      type: 'promotional',
      contentType: 'movie',
      position: 2,
      isActive: true,
      targetPlatforms: ['web', 'mobile'],
    },
  ];

  await BannerModel.insertMany(banners);
  logger.info('Seeded sample banners');
}

async function seedNotificationTemplates() {
  const count = await NotificationTemplateModel.countDocuments();
  if (count > 0) return;

  const templates = [
    {
      type: 'Change Password',
      userType: 'user',
      recipients: ['User', 'Admin', 'Demo Admin'],
      status: true,
      notifSubject: 'Your Password Has Been Changed',
      notifTemplate: 'Hello [[ user_name ]], your password has been changed successfully for your account.',
      emailSubject: 'Password Change Successful',
      emailTemplate: 'Hello [[ user_name ]],\n\nYour password has been changed successfully.',
    },
    {
      type: 'Continue Watch',
      userType: 'user',
      recipients: ['User'],
      status: true,
      notifSubject: 'Continue Watching',
      notifTemplate: 'Hello [[ user_name ]], continue watching "[[ movie_name ]]".',
      emailSubject: 'Continue Watching Reminder',
      emailTemplate: 'Hello [[ user_name ]],\n\nYou haven\'t finished watching "[[ movie_name ]]".',
    },
    {
      type: 'Episode Add',
      userType: 'user',
      recipients: ['User', 'Admin'],
      status: true,
      notifSubject: 'New Episode Added',
      notifTemplate: 'Hello [[ user_name ]], a new episode [[ episode_name ]] has been added.',
      emailSubject: 'New Episode Available',
      emailTemplate: 'Hello [[ user_name ]],\n\nA new episode is now available: [[ episode_name ]].',
    },
    {
      type: 'Expiry Plan',
      userType: 'user',
      recipients: ['User'],
      status: true,
      notifSubject: 'Subscription Plan Expiry Reminder',
      notifTemplate: 'Your subscription plan "[[ plan_name ]]" will expire soon. Expiry date: [[ end_date ]].',
      emailSubject: 'Your Subscription is Expiring Soon',
      emailTemplate: 'Hello [[ user_name ]],\n\nYour subscription plan "[[ plan_name ]]" will expire on [[ end_date ]].',
    },
    {
      type: 'Forget Email/Password',
      userType: 'user',
      recipients: ['User'],
      status: true,
      notifSubject: 'Password Reset Request',
      notifTemplate: 'Hello [[ user_name ]], your OTP code is [[ otp_code ]].',
      emailSubject: 'Reset Your Password',
      emailTemplate: 'Hello [[ user_name ]],\n\nYour password reset OTP is: [[ otp_code ]].\n\nThis OTP will expire in 10 minutes.',
    },
    {
      type: 'Movie Add',
      userType: 'user',
      recipients: ['User', 'Admin'],
      status: true,
      notifSubject: 'New Movie Added',
      notifTemplate: 'Hello [[ user_name ]], a new movie "[[ movie_name ]]" has been added.',
      emailSubject: 'New Movie Available',
      emailTemplate: 'Hello [[ user_name ]],\n\nA new movie "[[ movie_name ]]" is now available to watch.',
    },
    {
      type: 'New Subscription',
      userType: 'user',
      recipients: ['User', 'Admin'],
      status: true,
      notifSubject: 'Subscription Activated',
      notifTemplate: 'Hello [[ user_name ]], your subscription to "[[ plan_name ]]" has been activated.',
      emailSubject: 'Subscription Activated Successfully',
      emailTemplate: 'Hello [[ user_name ]],\n\nYour [[ plan_name ]] subscription has been activated successfully.\n\nStart Date: [[ start_date ]]\nEnd Date: [[ end_date ]]',
    },
    {
      type: 'Registration',
      userType: 'user',
      recipients: ['User', 'Admin'],
      status: true,
      notifSubject: 'Welcome to StreamVault',
      notifTemplate: 'Hello [[ user_name ]], welcome to StreamVault! Your account has been created successfully.',
      emailSubject: 'Welcome to StreamVault',
      emailTemplate: 'Hello [[ user_name ]],\n\nWelcome to StreamVault! Your account has been created successfully.\n\nStart exploring our vast library of content.',
    },
    {
      type: 'TV Show Add',
      userType: 'user',
      recipients: ['User', 'Admin'],
      status: false,
      notifSubject: 'New TV Show Added',
      notifTemplate: 'Hello [[ user_name ]], a new TV show "[[ tv_show_name ]]" has been added.',
      emailSubject: 'New TV Show Available',
      emailTemplate: 'Hello [[ user_name ]],\n\nA new TV show "[[ tv_show_name ]]" is now available to watch.',
    },
    {
      type: 'Video Add',
      userType: 'user',
      recipients: ['User', 'Admin'],
      status: true,
      notifSubject: 'New Video Added',
      notifTemplate: 'Hello [[ user_name ]], a new video has been added.',
      emailSubject: 'New Video Available',
      emailTemplate: 'Hello [[ user_name ]],\n\nA new video is now available to watch.',
    },
  ];

  await NotificationTemplateModel.insertMany(templates);
  logger.info('Seeded notification templates');
}

async function seedNotifications() {
  const count = await NotificationModel.countDocuments();
  if (count > 0) return;

  const notifications = [
    {
      title: 'Welcome to StreamVault',
      body: 'Thank you for joining StreamVault! Start exploring our vast library of movies and TV shows.',
      type: 'system' as const,
      targetAudience: 'all' as const,
      status: 'sent' as const,
      metrics: { targetCount: 1000, sentCount: 1000, openedCount: 850, clickedCount: 420 },
      priority: 'normal' as const,
      sentAt: new Date(Date.now() - 86400000 * 7),
    },
    {
      title: 'New Movie: Neon Prophecy',
      body: 'A new sci-fi thriller "Neon Prophecy" is now available to watch. Don\'t miss it!',
      type: 'content_release' as const,
      targetAudience: 'all' as const,
      status: 'sent' as const,
      metrics: { targetCount: 5000, sentCount: 5000, openedCount: 3200, clickedCount: 1800 },
      priority: 'high' as const,
      sentAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      title: 'Subscription Expiring Soon',
      body: 'Your subscription plan will expire in 3 days. Renew now to continue enjoying premium content.',
      type: 'subscription' as const,
      targetAudience: 'premium' as const,
      status: 'sent' as const,
      metrics: { targetCount: 200, sentCount: 200, openedCount: 180, clickedCount: 120 },
      priority: 'high' as const,
      sentAt: new Date(Date.now() - 86400000 * 1),
    },
    {
      title: 'Special Offer: 50% Off Annual Plan',
      body: 'Limited time offer! Get 50% off on our annual subscription plan. Valid until end of month.',
      type: 'promotional' as const,
      targetAudience: 'free' as const,
      status: 'sent' as const,
      metrics: { targetCount: 3000, sentCount: 3000, openedCount: 1500, clickedCount: 600 },
      priority: 'normal' as const,
      sentAt: new Date(Date.now() - 86400000 * 5),
    },
    {
      title: 'Continue Watching: The Last Heist',
      body: 'You haven\'t finished watching "The Last Heist". Continue where you left off!',
      type: 'reminder' as const,
      targetAudience: 'all' as const,
      status: 'sent' as const,
      metrics: { targetCount: 500, sentCount: 500, openedCount: 300, clickedCount: 200 },
      priority: 'low' as const,
      sentAt: new Date(Date.now() - 86400000 * 2),
    },
  ];

  await NotificationModel.insertMany(notifications);
  logger.info('Seeded notifications');
}

export async function seedDatabase(): Promise<void> {
  try {
    await Promise.all([
      seedSubscriptionPlans(),
      seedCategories(),
      seedLanguages(),
      seedAdminUsers(),
    ]);
    
    // Seed content in order
    await seedSampleContent();
    await seedMovies();
    await seedEpisodes();
    await seedBanners();
    
    await Promise.all([
      seedNotificationTemplates(),
      seedNotifications(),
    ]);
    
    logger.info('Database seeding complete');
  } catch (err) {
    logger.error({ err }, 'Database seeding failed');
  }
}
