
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { MessageCentralService } from '../services/messageCentralService';

const messageCentralService = new MessageCentralService();
const STATIC_OTP = '1234';

// Validation schemas
const sendOtpSchema = z.object({
  mobileNumber: z.string().regex(/^\d{10}$/, 'Mobile number must be 10 digits'),
});

const verifyOtpSchema = z.object({
  mobileNumber: z.string().regex(/^\d{10}$/, 'Mobile number must be 10 digits'),
  verificationId: z.string().optional(),
  otp: z.string().regex(/^\d{4}$/, 'OTP must be 4 digits'),
});

const setLanguageSchema = z.object({
  language: z.string().trim().min(1, 'Language is required'),
});

export const sendOtp = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = sendOtpSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        message: 'Validation failed',
        errors: body.error.flatten().fieldErrors,
      });
    }
    const { mobileNumber } = body.data;

    const result = await messageCentralService.sendOtp(mobileNumber);
    if (!result.success) {
      return reply.status(400).send(result);
    }

    return reply.status(200).send(result);
  } catch (error) {
    console.error('Error sending OTP:', error);
    console.error('Error stack:', (error as Error).stack);
    return reply.status(500).send({ 
      success: false, 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
};

export const verifyOtp = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = verifyOtpSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        message: 'Validation failed',
        errors: body.error.flatten().fieldErrors,
      });
    }
    const { mobileNumber, verificationId, otp } = body.data;

    const verifyResult = await messageCentralService.verifyOtp(verificationId, otp);
    if (!verifyResult.success) {
      return reply.status(400).send({ 
        success: false, 
        message: verifyResult.message || `Invalid OTP. Use ${STATIC_OTP}` 
      });
    }

    let user = await UserModel.findOne({ phone: mobileNumber });

    if (!user) {
      const newProfile = {
        name: 'User',
        isKids: false,
        maturityLevel: 18,
      };
      user = new UserModel({
        phone: mobileNumber,
        name: 'User',
        email: `${mobileNumber}@temp.local`,
        profiles: [newProfile],
        languageSelectionSkipped: false,
      });
      await user.save();
    } else {
      user.lastLogin = new Date();
      user.loginCount += 1;
      await user.save();
    }

    const server = request.server as any;
    const tokenPayload = {
      id: user._id.toString(),
      name: user.name,
      phone: user.phone,
      role: 'user' as const,
    };
    const accessToken = server.jwt.sign(tokenPayload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    return reply.status(200).send({
      success: true,
      accessToken,
      userId: user._id.toString(),
      expiresIn: 900,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    console.error('Error stack:', (error as Error).stack);
    return reply.status(500).send({ 
      success: false, 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
};

export const setPreferredLanguage = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };
    const body = setLanguageSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        message: 'Validation failed',
        errors: body.error.flatten().fieldErrors,
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return reply.status(404).send({ success: false, message: 'User not found' });
    }

    user.preferredLanguage = body.data.language;
    user.languageSelectionSkipped = false;
    if (user.profiles.length > 0) {
      user.profiles[0].language = body.data.language;
    }
    await user.save();

    return reply.status(200).send({
      success: true,
      message: 'Preferred language updated successfully',
      data: {
        userId: user._id.toString(),
        preferredLanguage: user.preferredLanguage,
        languageSelectionSkipped: user.languageSelectionSkipped,
      },
    });
  } catch (error) {
    console.error('Error setting preferred language:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};

export const skipPreferredLanguage = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };

    const user = await UserModel.findById(userId);
    if (!user) {
      return reply.status(404).send({ success: false, message: 'User not found' });
    }

    user.preferredLanguage = undefined;
    user.languageSelectionSkipped = true;
    if (user.profiles.length > 0) {
      user.profiles[0].language = undefined;
    }
    await user.save();

    return reply.status(200).send({
      success: true,
      message: 'Language selection skipped successfully',
      data: {
        userId: user._id.toString(),
        preferredLanguage: null,
        languageSelectionSkipped: true,
      },
    });
  } catch (error) {
    console.error('Error skipping preferred language:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};
