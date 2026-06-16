
import type { FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import { storeRefreshToken, revokeRefreshToken } from '../lib/redis';
import { AdminUserModel } from '../models/AdminUser';

export const login = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.status(400).send({
        error: 'email and password are required',
      });
    }

    const admin = await AdminUserModel.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    if (!admin) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const payload = {
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };

    await AdminUserModel.findByIdAndUpdate(admin._id, {
      $set: { lastLogin: new Date() },
      $inc: { loginCount: 1 },
    });

    const server = request.server as any;
    const accessToken = server.jwt.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    const refreshToken = server.jwt.sign(
      { ...payload, type: 'refresh' },
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }
    );

    await storeRefreshToken(refreshToken, payload.id);

    return reply.status(200).send({
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
    });
  }
};

export const getMe = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request.user as any).id;
    const admin = await AdminUserModel.findById(userId).select('-passwordHash').lean();
    if (!admin) {
      return reply.status(404).send({ error: 'User not found' });
    }
    // Merge with default permissions to ensure all fields exist
    const defaultModulePermissions = {
      movies: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      shows: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      genres: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      actors: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      directors: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      languages: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      categories: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      mediaLibrary: { canView: true, canUpload: false, canDelete: false },
      banners: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      promotions: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      influencers: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      ads: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      pages: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      faqs: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      subscriptions: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      subscriptionPlans: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      planLimits: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      notifications: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      notificationTemplates: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    };
    const mergedModulePermissions = { ...defaultModulePermissions };
    if (admin.modulePermissions) {
      for (const key of Object.keys(defaultModulePermissions) as Array<keyof typeof defaultModulePermissions>) {
        mergedModulePermissions[key] = {
          ...defaultModulePermissions[key],
          ...(admin.modulePermissions[key] || {}),
        };
      }
    }
    return { 
      user: { 
        ...admin, 
        modulePermissions: mergedModulePermissions 
      } 
    };
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { refreshToken } = (request.body as any) || {};
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    return reply.status(200).send({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request.user as any).id;
    const { name, avatar } = request.body as { name?: string; avatar?: string };

    const updateData: any = {};
    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;

    const admin = await AdminUserModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-passwordHash').lean();

    if (!admin) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const updatePassword = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request.user as any).id;
    const { currentPassword, newPassword } = request.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      return reply.status(400).send({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return reply.status(400).send({ error: 'New password must be at least 6 characters long' });
    }

    const admin = await AdminUserModel.findById(userId);
    if (!admin) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await AdminUserModel.findByIdAndUpdate(userId, {
      $set: { passwordHash },
    });

    return reply.send({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};
