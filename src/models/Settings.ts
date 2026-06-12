import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  // Business
  platformName: string;
  contactNo: string;
  inquiryEmail: string;
  siteDescription: string;
  copyrightText: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  // Branding
  logoUrl: string;
  darkLogoUrl: string;
  lightLogoUrl: string;
  faviconUrl: string;
  logoStyle: 'icon' | 'fill';
  loginTitle: string;
  loginSubtitle: string;
  loginButtonText: string;
  // Mail
  mailEmail: string;
  mailDriver: string;
  mailHost: string;
  mailPort: string;
  mailEncryption: string;
  mailUsername: string;
  mailPassword: string;
  mailFrom: string;
  mailFromName: string;
  // Storage
  storageDriver: 'local' | 's3' | 'bunny';
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  awsBucket: string;
  awsPathStyleEndpoint: boolean;
  bunnyStorageZone: string;
  bunnyAccessKey: string;
  bunnyCdnUrl: string;
  // Customization
  primaryColor: string;
  colorTheme: string;
  navbarStyle: 'glass' | 'sticky' | 'transparent' | 'default';
  navbarHide: boolean;
  cardStyle: 'default' | 'glass' | 'transparent';
  menuStyle: 'mini' | 'hover' | 'boxed' | 'soft';
  activeMenuStyle: string;
  // Custom Code
  headerCode: string;
  footerCode: string;
  // Modules
  moduleUsers: boolean;
  moduleLanguages: boolean;
  moduleAds: boolean;
  modulePromotions: boolean;
  moduleBanners: boolean;
  modulePages: boolean;
  moduleMovies: boolean;
  moduleTvShows: boolean;
  moduleLiveTV: boolean;
  moduleVideos: boolean;
  moduleCastCrew: boolean;
  moduleAdsManager: boolean;
  moduleSubscriptions: boolean;
  modulePlans: boolean;
  // Misc
  maintenanceMode: boolean;
  userRegistration: boolean;
  socialLogin: boolean;
  twoFactorAuth: boolean;
  emailVerification: boolean;
  // Notifications
  fcmServerKey: string;
  fcmSenderId: string;
  firebaseApiKey: string;
  firebaseProjectId: string;
  firebaseAppId: string;
  // Language
  defaultLanguage: string;
  rtlSupport: boolean;
  // Notification Configuration
  notifNewUser: boolean;
  notifNewSubscription: boolean;
  notifNewContent: boolean;
  notifPaymentSuccess: boolean;
  notifPaymentFailed: boolean;
  notifContentExpiry: boolean;
  // Currency
  currencyCode: string;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  decimalPlaces: number;
  // SEO
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  googleAnalyticsId: string;
  seoImage: string;
  googleVerification: string;
  canonicalUrl: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    // Business
    platformName: { type: String, default: 'StreamVault' },
    contactNo: { type: String, default: '' },
    inquiryEmail: { type: String, default: '' },
    siteDescription: { type: String, default: '' },
    copyrightText: { type: String, default: '© 2026 StreamVault. All Rights Reserved.' },
    facebookUrl: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    youtubeUrl: { type: String, default: '' },
    // Branding
    logoUrl: { type: String, default: '' },
    darkLogoUrl: { type: String, default: '' },
    lightLogoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    logoStyle: { type: String, enum: ['icon', 'fill'], default: 'icon' },
    loginTitle: { type: String, default: 'Welcome Back' },
    loginSubtitle: { type: String, default: 'Admin Console' },
    loginButtonText: { type: String, default: 'Sign In' },
    // Mail
    mailEmail: { type: String, default: '' },
    mailDriver: { type: String, default: 'smtp' },
    mailHost: { type: String, default: 'smtp.gmail.com' },
    mailPort: { type: String, default: '587' },
    mailEncryption: { type: String, default: 'tls' },
    mailUsername: { type: String, default: '' },
    mailPassword: { type: String, default: '' },
    mailFrom: { type: String, default: '' },
    mailFromName: { type: String, default: 'StreamVault' },
    // Storage
    storageDriver: { type: String, enum: ['local', 's3', 'bunny'], default: 'local' },
    awsAccessKeyId: { type: String, default: '' },
    awsSecretAccessKey: { type: String, default: '' },
    awsRegion: { type: String, default: '' },
    awsBucket: { type: String, default: '' },
    awsPathStyleEndpoint: { type: Boolean, default: false },
    bunnyStorageZone: { type: String, default: '' },
    bunnyAccessKey: { type: String, default: '' },
    bunnyCdnUrl: { type: String, default: '' },
    // Customization
    primaryColor: { type: String, default: '#e50914' },
    colorTheme: { type: String, default: 'blue-green' },
    navbarStyle: { type: String, enum: ['glass', 'sticky', 'transparent', 'default'], default: 'default' },
    navbarHide: { type: Boolean, default: false },
    cardStyle: { type: String, enum: ['default', 'glass', 'transparent'], default: 'default' },
    menuStyle: { type: String, enum: ['mini', 'hover', 'boxed', 'soft'], default: 'hover' },
    activeMenuStyle: { type: String, default: 'left-bordered' },
    // Custom Code
    headerCode: { type: String, default: '' },
    footerCode: { type: String, default: '' },
    // Modules
    moduleUsers: { type: Boolean, default: true },
    moduleLanguages: { type: Boolean, default: true },
    moduleAds: { type: Boolean, default: true },
    modulePromotions: { type: Boolean, default: true },
    moduleBanners: { type: Boolean, default: true },
    modulePages: { type: Boolean, default: true },
    moduleMovies: { type: Boolean, default: true },
    moduleTvShows: { type: Boolean, default: true },
    moduleLiveTV: { type: Boolean, default: true },
    moduleVideos: { type: Boolean, default: true },
    moduleCastCrew: { type: Boolean, default: true },
    moduleAdsManager: { type: Boolean, default: true },
    moduleSubscriptions: { type: Boolean, default: true },
    modulePlans: { type: Boolean, default: true },
    // Misc
    maintenanceMode: { type: Boolean, default: false },
    userRegistration: { type: Boolean, default: true },
    socialLogin: { type: Boolean, default: true },
    twoFactorAuth: { type: Boolean, default: false },
    emailVerification: { type: Boolean, default: true },
    // Notifications
    fcmServerKey: { type: String, default: '' },
    fcmSenderId: { type: String, default: '' },
    firebaseApiKey: { type: String, default: '' },
    firebaseProjectId: { type: String, default: '' },
    firebaseAppId: { type: String, default: '' },
    // Language
    defaultLanguage: { type: String, default: 'en' },
    rtlSupport: { type: Boolean, default: false },
    // Notification Configuration
    notifNewUser: { type: Boolean, default: true },
    notifNewSubscription: { type: Boolean, default: true },
    notifNewContent: { type: Boolean, default: false },
    notifPaymentSuccess: { type: Boolean, default: true },
    notifPaymentFailed: { type: Boolean, default: true },
    notifContentExpiry: { type: Boolean, default: false },
    // Currency
    currencyCode: { type: String, default: 'USD' },
    currencySymbol: { type: String, default: '$' },
    currencyPosition: { type: String, enum: ['before', 'after'], default: 'before' },
    decimalPlaces: { type: Number, default: 2 },
    // SEO
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaKeywords: { type: String, default: '' },
    googleAnalyticsId: { type: String, default: '' },
    seoImage: { type: String, default: '' },
    googleVerification: { type: String, default: '' },
    canonicalUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

export const SettingsModel = mongoose.model<ISettings>('Settings', SettingsSchema);
