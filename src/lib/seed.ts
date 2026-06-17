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
import { SectionModel } from '../models/Section';

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

  const dramaData = [
    { title: 'CEO Billionaire', genre: 'Romance', views: 5647293, daysOld: 30, trending: true, isNew: true, featured: false },
    { title: 'Love Affairs', genre: 'Romance', views: 3241520, daysOld: 45, trending: true, isNew: true, featured: false },
    { title: 'Binge Worthy Series', genre: 'Thriller', views: 7241890, daysOld: 120, trending: true, isNew: false, featured: true },
    { title: 'Story TV Special', genre: 'Family', views: 1892345, daysOld: 15, trending: false, isNew: true, featured: false },
    { title: 'Top Drama of All Time', genre: 'Epic', views: 9876543, daysOld: 365, trending: true, isNew: false, featured: true },
    { title: 'Royal Affair', genre: 'Romance', views: 4500000, daysOld: 25, trending: true, isNew: true, featured: false },
    { title: 'Mystery Mansion', genre: 'Thriller', views: 6700000, daysOld: 60, trending: true, isNew: false, featured: true },
    { title: 'Small Town Dreams', genre: 'Drama', views: 2300000, daysOld: 80, trending: false, isNew: true, featured: false },
    { title: 'College Days', genre: 'Romance', views: 3800000, daysOld: 40, trending: true, isNew: true, featured: false },
    { title: 'Crime Patrol', genre: 'Crime', views: 8200000, daysOld: 150, trending: true, isNew: false, featured: true },
    { title: 'Love in Paris', genre: 'Romance', views: 1900000, daysOld: 10, trending: true, isNew: true, featured: false },
    { title: 'The Heist', genre: 'Thriller', views: 5400000, daysOld: 70, trending: true, isNew: false, featured: false },
    { title: 'Family Secrets', genre: 'Drama', views: 2700000, daysOld: 90, trending: false, isNew: true, featured: false },
    { title: 'Village Life', genre: 'Family', views: 1500000, daysOld: 5, trending: false, isNew: true, featured: false },
    { title: 'Secret Agent', genre: 'Action', views: 7500000, daysOld: 110, trending: true, isNew: false, featured: true },
    { title: 'First Love', genre: 'Romance', views: 3100000, daysOld: 35, trending: true, isNew: true, featured: false },
    { title: 'Dark Waters', genre: 'Thriller', views: 4900000, daysOld: 55, trending: true, isNew: false, featured: false },
    { title: 'Wedding Season', genre: 'Romance', views: 2200000, daysOld: 20, trending: true, isNew: true, featured: false },
    { title: 'Urban Legends', genre: 'Horror', views: 3600000, daysOld: 100, trending: false, isNew: false, featured: false },
    { title: 'The Inheritance', genre: 'Drama', views: 4200000, daysOld: 65, trending: true, isNew: false, featured: false },
    { title: 'Coffee Shop Tales', genre: 'Romance', views: 1700000, daysOld: 12, trending: true, isNew: true, featured: false },
    { title: 'Ghost Stories', genre: 'Horror', views: 2800000, daysOld: 130, trending: false, isNew: false, featured: false },
    { title: 'Sports Drama', genre: 'Sports', views: 5100000, daysOld: 48, trending: true, isNew: false, featured: false },
    { title: 'Star Crossed', genre: 'Romance', views: 2400000, daysOld: 8, trending: true, isNew: true, featured: false },
    { title: 'Detective X', genre: 'Crime', views: 6300000, daysOld: 85, trending: true, isNew: false, featured: true },
    { title: 'Modern Family', genre: 'Family', views: 1600000, daysOld: 18, trending: false, isNew: true, featured: false },
    { title: 'High School Reunion', genre: 'Romance', views: 2000000, daysOld: 28, trending: true, isNew: true, featured: false },
    { title: 'Time Traveler', genre: 'Sci-Fi', views: 4700000, daysOld: 75, trending: true, isNew: false, featured: false },
    { title: 'The Promise', genre: 'Drama', views: 3300000, daysOld: 50, trending: false, isNew: false, featured: false },
    { title: 'Summer Camp', genre: 'Romance', views: 1950000, daysOld: 14, trending: true, isNew: true, featured: false },
    { title: 'Medical Emergency', genre: 'Drama', views: 4100000, daysOld: 95, trending: true, isNew: false, featured: false },
    { title: 'Forbidden Love', genre: 'Romance', views: 5800000, daysOld: 32, trending: true, isNew: true, featured: false },
    { title: 'Haunted House', genre: 'Horror', views: 3000000, daysOld: 115, trending: false, isNew: false, featured: false },
    { title: 'Startup Dreams', genre: 'Drama', views: 2600000, daysOld: 38, trending: false, isNew: true, featured: false },
    { title: 'Beach Romance', genre: 'Romance', views: 2100000, daysOld: 6, trending: true, isNew: true, featured: false },
    { title: 'Political Thriller', genre: 'Thriller', views: 6900000, daysOld: 140, trending: true, isNew: false, featured: true },
    { title: 'Music School', genre: 'Drama', views: 1800000, daysOld: 22, trending: false, isNew: true, featured: false },
    // Add MORE dummy content!
    { title: 'Mountain Escape', genre: 'Adventure', views: 3900000, daysOld: 17, trending: true, isNew: true, featured: false },
    { title: 'Desert Nights', genre: 'Romance', views: 4200000, daysOld: 23, trending: true, isNew: true, featured: false },
    { title: 'City Lights', genre: 'Drama', views: 2900000, daysOld: 33, trending: false, isNew: false, featured: false },
    { title: 'Space Odyssey', genre: 'Sci-Fi', views: 7100000, daysOld: 88, trending: true, isNew: false, featured: true },
    { title: 'Forest Secrets', genre: 'Mystery', views: 5300000, daysOld: 41, trending: true, isNew: true, featured: false },
  ];

  const thumbnails = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516571748831-5d81767b788d?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e63?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1460186141667-b3180f76e83b?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1489370958616-7beeec353e52?w=400&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=600&fit=crop&q=80',
  ];

  const content = dramaData.map((drama, index) => {
    const allSections = [
      'top-10-story-tv', 'ceo-billionaire', 'just-launched', 'love-affairs', 
      'binge-worthy', 'story-tv-specials', 'top-10-new-releases', 'top-dramas',
      'royal-affair', 'mystery-mansion', 'small-town-dreams', 'college-days',
      'crime-patrol', 'love-in-paris', 'the-heist', 'family-secrets'
    ];
    
    // Assign 2-4 sections per drama, distribute across all sections
    const numSections = 2 + (index % 3);
    let assignedSections: string[] = [];
    for (let i = 0; i < numSections; i++) {
      const sectionIndex = (index + i) % allSections.length;
      assignedSections.push(allSections[sectionIndex]);
    }
    assignedSections = [...new Set(assignedSections)]; // Remove duplicates
    
    return {
      title: drama.title,
      type: 'series',
      contentType: 'drama',
      description: `A captivating ${drama.genre.toLowerCase()} drama that will keep you hooked from the first episode.`,
      shortDescription: `${drama.genre} drama you won't forget`,
      thumbnail: thumbnails[index % thumbnails.length],
      bannerImage: thumbnails[(index + 2) % thumbnails.length].replace('w=400&h=600', 'w=1200&h=600'),
      genres: [drama.genre, 'Drama'],
      languages: ['Hindi', 'English'],
      subtitleLanguages: ['Hindi', 'English'],
      audioLanguages: ['Hindi'],
      year: 2023 + (index % 2),
      rating: index % 3 === 0 ? 'TV-MA' : (index % 3 === 1 ? 'TV-14' : 'TV-PG'),
      ageRating: index % 3 === 0 ? 17 : (index % 3 === 1 ? 13 : 10),
      status: 'published',
      hlsUrl: `https://example.com/hls/${drama.title.toLowerCase().replace(/ /g, '-')}/master.m3u8`,
      views: drama.views,
      likes: Math.floor(drama.views * 0.08),
      shares: Math.floor(drama.views * 0.02),
      featured: drama.featured,
      trending: drama.trending,
      isNewContent: drama.isNew,
      isExclusive: index % 4 === 0,
      downloadAllowed: index % 2 === 0,
      cast: [
        { name: 'Actor ' + (index + 1), role: 'Lead Actor', character: 'Hero ' + (index + 1) },
        { name: 'Actress ' + (index + 1), role: 'Lead Actress', character: 'Heroine ' + (index + 1) }
      ],
      crew: [{ name: 'Director ' + (index + 1), role: 'Director' }],
      director: 'Director ' + (index + 1),
      producer: 'Producer ' + (index + 1),
      studio: 'Story TV Originals',
      country: 'India',
      tags: [drama.genre.toLowerCase(), 'drama', 'must-watch'],
      imdbRating: 7.5 + (index % 20) / 10,
      maturityContent: index % 3 === 0 ? ['Violence', 'Strong Language'] : [],
      seasons: 1 + (index % 3),
      sections: assignedSections,
      planRequired: index % 4 === 0 ? 'premium' : (index % 4 === 1 ? 'basic' : 'free'),
      createdAt: daysAgo(drama.daysOld),
      updatedAt: daysAgo(drama.daysOld - Math.min(10, drama.daysOld)),
    };
  });

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
          title: `${item.title} - Episode ${i}`,
          description: `Watch ${item.title} Episode ${i} - ${item.description}`,
          thumbnail: item.thumbnail,
          duration: 1200 + Math.floor(Math.random() * 600), // 20-30 minutes
          season: 1,
          episode: i,
          isFree: i <= 3, // First 3 free
          isLocked: i > 3,
          hlsUrl: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`, // Public test stream URL
          views: Math.floor(Math.random() * 1000000),
          likes: Math.floor(Math.random() * 50000),
          shares: Math.floor(Math.random() * 10000),
          downloadAllowed: i <= 3,
          subtitleLanguages: ['Hindi', 'English'],
          audioLanguages: ['Hindi'],
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

async function seedSections() {
  await SectionModel.deleteMany({});

  const dramaSections = [
    { key: 'top-10-story-tv', title: 'Top 10 on Story TV', contentType: 'drama', sortBy: { views: -1 }, limit: 10, position: 1, isActive: true, layout: 'horizontal' },
    { key: 'ceo-billionaire', title: 'CEO Billionaire', contentType: 'drama', filter: { sections: 'ceo-billionaire' }, sortBy: { createdAt: -1 }, limit: 10, position: 2, isActive: true, layout: 'horizontal' },
    { key: 'just-launched', title: 'Just Launched', contentType: 'drama', filter: { isNewContent: true }, sortBy: { createdAt: -1 }, limit: 10, position: 3, isActive: true, layout: 'vertical' },
    { key: 'love-affairs', title: 'Love Affairs', contentType: 'drama', filter: { sections: 'love-affairs' }, sortBy: { views: -1 }, limit: 10, position: 4, isActive: true, layout: 'horizontal' },
    { key: 'binge-worthy', title: 'Binge Worthy Series', contentType: 'drama', filter: { sections: 'binge-worthy' }, sortBy: { views: -1 }, limit: 10, position: 5, isActive: true, layout: 'grid-2' },
    { key: 'story-tv-specials', title: 'Story TV Specials', contentType: 'drama', filter: { sections: 'story-tv-specials' }, sortBy: { views: -1 }, limit: 10, position: 6, isActive: true, layout: 'horizontal' },
    { key: 'top-10-new-releases', title: 'Top 10 New Releases', contentType: 'drama', filter: { isNewContent: true }, sortBy: { views: -1 }, limit: 10, position: 7, isActive: true, layout: 'vertical' },
    { key: 'top-dramas', title: 'Top Dramas Of All Time', contentType: 'drama', sortBy: { views: -1 }, limit: 10, position: 8, isActive: true, layout: 'horizontal' },
    { key: 'royal-affair', title: 'Royal Affair', contentType: 'drama', filter: { sections: 'royal-affair' }, sortBy: { views: -1 }, limit: 10, position: 9, isActive: true, layout: 'horizontal' },
    { key: 'mystery-mansion', title: 'Mystery Mansion', contentType: 'drama', filter: { sections: 'mystery-mansion' }, sortBy: { views: -1 }, limit: 10, position: 10, isActive: true, layout: 'grid-3' },
    { key: 'small-town-dreams', title: 'Small Town Dreams', contentType: 'drama', filter: { sections: 'small-town-dreams' }, sortBy: { views: -1 }, limit: 10, position: 11, isActive: true, layout: 'horizontal' },
    { key: 'college-days', title: 'College Days', contentType: 'drama', filter: { sections: 'college-days' }, sortBy: { views: -1 }, limit: 10, position: 12, isActive: true, layout: 'vertical' },
    { key: 'crime-patrol', title: 'Crime Patrol', contentType: 'drama', filter: { sections: 'crime-patrol' }, sortBy: { views: -1 }, limit: 10, position: 13, isActive: true, layout: 'horizontal' },
    { key: 'love-in-paris', title: 'Love in Paris', contentType: 'drama', filter: { sections: 'love-in-paris' }, sortBy: { views: -1 }, limit: 10, position: 14, isActive: true, layout: 'horizontal' },
    { key: 'the-heist', title: 'The Heist', contentType: 'drama', filter: { sections: 'the-heist' }, sortBy: { views: -1 }, limit: 10, position: 15, isActive: true, layout: 'grid-2' },
    { key: 'family-secrets', title: 'Family Secrets', contentType: 'drama', filter: { sections: 'family-secrets' }, sortBy: { views: -1 }, limit: 10, position: 16, isActive: true, layout: 'horizontal' },
  ];

  const movieSections = [
    { key: 'featured', title: 'Featured', contentType: 'movie', filter: { featured: true }, sortBy: { createdAt: -1 }, limit: 10, position: 1, isActive: true, layout: 'horizontal' },
    { key: 'trending', title: 'Trending', contentType: 'movie', filter: { trending: true }, sortBy: { views: -1 }, limit: 10, position: 2, isActive: true, layout: 'vertical' },
    { key: 'new-releases', title: 'New Releases', contentType: 'movie', filter: { isNewContent: true }, sortBy: { createdAt: -1 }, limit: 10, position: 3, isActive: true, layout: 'horizontal' },
    { key: 'top-rated', title: 'Top Rated', contentType: 'movie', sortBy: { views: -1 }, limit: 10, position: 4, isActive: true, layout: 'grid-2' },
  ];

  await SectionModel.insertMany([...dramaSections, ...movieSections]);
  logger.info('Seeded sample sections');
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
    await seedSections();
    
    await Promise.all([
      seedNotificationTemplates(),
      seedNotifications(),
    ]);
    
    logger.info('Database seeding complete');
  } catch (err) {
    logger.error({ err }, 'Database seeding failed');
  }
}
