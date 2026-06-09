import mongoose, { Schema, Document } from 'mongoose';

export interface IContent extends Document {
  title: string;
  originalTitle?: string;
  type: 'movie' | 'series';
  description?: string;
  shortDescription?: string;
  thumbnail?: string;
  bannerImage?: string;
  trailerUrl?: string;
  genres: string[];
  languages: string[];
  subtitleLanguages: string[];
  audioLanguages: string[];
  year?: number;
  rating?: string;
  ageRating: number;
  status: 'published' | 'draft' | 'processing' | 'moderation' | 'rejected';
  rejectionReason?: string;
  hlsUrl?: string;
  videoQualities?: Array<{
    quality: '144p' | '360p' | '480p' | '720p' | '1080p';
    url: string;
    size: number;
  }>;
  duration?: number;
  views: number;
  likes: number;
  shares: number;
  featured: boolean;
  trending: boolean;
  isNewContent: boolean;
  isExclusive: boolean;
  downloadAllowed: boolean;
  cast: Array<{ name: string; role: string; photo?: string; character?: string }>;
  crew: Array<{ name: string; role: string }>;
  director?: string;
  producer?: string;
  studio?: string;
  country?: string;
  tags: string[];
  imdbRating?: number;
  maturityContent: string[];
  seasons?: number;
  planRequired: 'free' | 'basic' | 'standard' | 'premium';
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema<IContent>(
  {
    title: { type: String, required: true, index: true },
    originalTitle: String,
    type: { type: String, enum: ['movie', 'series'], required: true },
    description: String,
    shortDescription: String,
    thumbnail: String,
    bannerImage: String,
    trailerUrl: String,
    genres: { type: [String], default: [] },
    languages: { type: [String], default: ['English'] },
    subtitleLanguages: { type: [String], default: [] },
    audioLanguages: { type: [String], default: [] },
    year: Number,
    rating: String,
    ageRating: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['published', 'draft', 'processing', 'moderation', 'rejected'],
      default: 'draft',
      index: true,
    },
    rejectionReason: String,
    hlsUrl: String,
    videoQualities: [
      {
        quality: { type: String, enum: ['144p', '360p', '480p', '720p', '1080p'] },
        url: String,
        size: Number,
      },
    ],
    duration: Number,
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    isNewContent: { type: Boolean, default: true },
    isExclusive: { type: Boolean, default: false },
    downloadAllowed: { type: Boolean, default: false },
    cast: [{ name: String, role: String, photo: String, character: String }],
    crew: [{ name: String, role: String }],
    director: String,
    producer: String,
    studio: String,
    country: String,
    tags: { type: [String], default: [] },
    imdbRating: { type: Number, min: 0, max: 10 },
    maturityContent: { type: [String], default: [] },
    seasons: Number,
    planRequired: { type: String, enum: ['free', 'basic', 'standard', 'premium'], default: 'free' },
    slug: { type: String, index: true },
    metaTitle: String,
    metaDescription: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ContentSchema.index({ title: 'text', description: 'text', tags: 'text' });
ContentSchema.index({ status: 1, type: 1 });
ContentSchema.index({ genres: 1 });
ContentSchema.index({ trending: 1, featured: 1 });

export const ContentModel = mongoose.model<IContent>('Content', ContentSchema);
