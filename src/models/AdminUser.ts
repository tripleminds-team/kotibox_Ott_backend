import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  role: 'superadmin' | 'admin' | 'moderator' | 'analyst';
  avatar?: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'moderator', 'analyst'],
      default: 'moderator',
    },
    avatar: String,
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    loginCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const AdminUserModel = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);
