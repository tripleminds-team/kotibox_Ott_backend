import mongoose, { Schema, Document } from 'mongoose';

export interface IPlanFeatures {
  videoQuality: 'SD' | 'HD' | 'FHD' | '4K';
  simultaneousScreens: number;
  downloadAllowed: boolean;
  maxDownloads: number;
  adsEnabled: boolean;
  liveTV: boolean;
  earlyAccess: boolean;
  exclusiveContent: boolean;
  offlineViewing: boolean;
  dolbyAtmos: boolean;
  supportPriority: 'standard' | 'priority' | 'vip';
}

export interface ISubscriptionPlan extends Document {
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  currency: string;
  features: IPlanFeatures;
  contentAccess: 'free' | 'basic' | 'standard' | 'premium';
  isActive: boolean;
  isPopular: boolean;
  trialDays: number;
  color: string;
  order: number;
  subscriberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: { type: String, default: '' },
    monthlyPrice: { type: Number, required: true, min: 0 },
    quarterlyPrice: { type: Number, required: true, min: 0 },
    annualPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    features: {
      videoQuality: { type: String, enum: ['SD', 'HD', 'FHD', '4K'], default: 'HD' },
      simultaneousScreens: { type: Number, default: 1 },
      downloadAllowed: { type: Boolean, default: false },
      maxDownloads: { type: Number, default: 0 },
      adsEnabled: { type: Boolean, default: true },
      liveTV: { type: Boolean, default: false },
      earlyAccess: { type: Boolean, default: false },
      exclusiveContent: { type: Boolean, default: false },
      offlineViewing: { type: Boolean, default: false },
      dolbyAtmos: { type: Boolean, default: false },
      supportPriority: { type: String, enum: ['standard', 'priority', 'vip'], default: 'standard' },
    },
    contentAccess: { type: String, enum: ['free', 'basic', 'standard', 'premium'], default: 'free' },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    trialDays: { type: Number, default: 0 },
    color: { type: String, default: '#e50914' },
    order: { type: Number, default: 0 },
    subscriberCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const SubscriptionPlanModel = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
