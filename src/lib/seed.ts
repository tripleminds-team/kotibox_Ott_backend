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
      email: 'admin@streamvault.com',
      name: 'StreamVault Admin',
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
  const count = await ContentModel.countDocuments();
  if (count > 0) return;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  const content = [
    {
      title: 'Neon Prophecy', type: 'movie',
      description: 'In a dystopian megacity, a rogue detective uncovers a conspiracy threatening the last free city on Earth.',
      genres: ['Sci-Fi', 'Action', 'Thriller'], languages: ['English', 'Hindi'],
      year: 2024, rating: 'TV-MA', status: 'published',
      hlsUrl: 'https://example.com/hls/neon-prophecy/master.m3u8',
      duration: 7560, views: 1847293, featured: true, trending: true, isNew: false,
      director: 'Alex Rivera', studio: 'StreamVault Originals',
      imdbRating: 8.2, tags: ['dystopian', 'cyberpunk', 'original'],
      planRequired: 'free', createdAt: daysAgo(90), updatedAt: daysAgo(85),
    },
    {
      title: 'The Last Heist', type: 'movie',
      description: 'A legendary thief comes out of retirement for one final job that goes catastrophically wrong.',
      genres: ['Crime', 'Thriller'], languages: ['English'],
      year: 2024, rating: 'TV-14', status: 'published',
      hlsUrl: 'https://example.com/hls/the-last-heist/master.m3u8',
      duration: 6840, views: 2341120, featured: false, trending: true, isNew: false,
      director: 'Sarah Kim', imdbRating: 7.8, tags: ['heist', 'crime'],
      planRequired: 'free', createdAt: daysAgo(60), updatedAt: daysAgo(55),
    },
    {
      title: 'Echoes of Tomorrow', type: 'movie',
      description: 'A quantum physicist accidentally fragments the timeline and must repair reality before it collapses.',
      genres: ['Sci-Fi', 'Drama'], languages: ['English', 'Hindi'],
      year: 2024, rating: 'PG-13', status: 'draft',
      duration: 8100, views: 0, isExclusive: true,
      imdbRating: 0, tags: ['time-travel', 'quantum'],
      planRequired: 'standard', createdAt: daysAgo(14), updatedAt: daysAgo(2),
    },
    {
      title: 'Grid Zero', type: 'series',
      description: 'An elite cyber-response unit battles a shadowy hacker collective threatening global infrastructure.',
      genres: ['Action', 'Sci-Fi', 'Thriller'], languages: ['English', 'Hindi', 'Tamil'],
      year: 2024, rating: 'TV-MA', status: 'published',
      duration: null, views: 4521037, featured: true, trending: true, isNew: true,
      isExclusive: true, director: 'Marcus Webb', seasons: 2,
      imdbRating: 9.1, tags: ['cybersecurity', 'action', 'original', 'exclusive'],
      planRequired: 'basic', createdAt: daysAgo(120), updatedAt: daysAgo(7),
    },
    {
      title: 'The Frontier', type: 'series',
      description: 'Stranded colonists on Mars fight for survival as rescue missions repeatedly fail.',
      genres: ['Sci-Fi', 'Drama'], languages: ['English'],
      year: 2023, rating: 'TV-14', status: 'published',
      views: 3128440, featured: false, isNew: false, seasons: 2,
      imdbRating: 8.6, tags: ['space', 'mars', 'survival'],
      planRequired: 'free', createdAt: daysAgo(365), updatedAt: daysAgo(30),
    },
    {
      title: 'Dark Inheritance', type: 'series',
      description: 'A family of lawyers unravels a decades-long criminal conspiracy hidden within their own firm.',
      genres: ['Crime', 'Drama'], languages: ['English', 'Hindi'],
      year: 2024, rating: 'TV-MA', status: 'moderation',
      views: 0, seasons: 1, tags: ['legal', 'crime-drama'],
      planRequired: 'standard', createdAt: daysAgo(7), updatedAt: daysAgo(1),
    },
  ];

  await ContentModel.insertMany(content);
  logger.info('Seeded sample content');
}

export async function seedDatabase(): Promise<void> {
  try {
    await Promise.all([
      seedSubscriptionPlans(),
      seedCategories(),
      seedLanguages(),
      seedAdminUsers(),
      seedSampleContent(),
    ]);
    logger.info('Database seeding complete');
  } catch (err) {
    logger.error({ err }, 'Database seeding failed');
  }
}
