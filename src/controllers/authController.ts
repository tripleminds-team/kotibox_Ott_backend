
import type { FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import { storeRefreshToken } from '../lib/redis';
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
  return { user: request.user };
};
