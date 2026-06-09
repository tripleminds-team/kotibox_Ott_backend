import type { FastifyReply, FastifyRequest } from 'fastify';
import { PromotionModel } from '../models/Promotion';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const listPromotions = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const q = request.query as { page?: string; limit?: string };
    const page = Math.max(1, parseInt(q.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(q.limit || '20')));

    const [promotions, total] = await Promise.all([
      PromotionModel.find().sort({ order: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PromotionModel.countDocuments(),
    ]);

    return {
      success: true,
      data: promotions.map(p => ({
        id: p._id.toString(),
        title: p.title,
        subtitle: p.subtitle,
        videoUrl: p.videoUrl,
        thumbnailUrl: p.thumbnailUrl,
        features: p.features,
        buttonText: p.buttonText,
        secondaryButtonText: p.secondaryButtonText,
        isActive: p.isActive,
        order: p.order,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};

export const getPromotion = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const promotion = await PromotionModel.findById(id).lean();

    if (!promotion) {
      return reply.status(404).send({ success: false, message: 'Promotion not found' });
    }

    return {
      success: true,
      data: {
        id: promotion._id.toString(),
        title: promotion.title,
        subtitle: promotion.subtitle,
        videoUrl: promotion.videoUrl,
        thumbnailUrl: promotion.thumbnailUrl,
        features: promotion.features,
        buttonText: promotion.buttonText,
        secondaryButtonText: promotion.secondaryButtonText,
        isActive: promotion.isActive,
        order: promotion.order,
      },
    };
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};

export const getActivePromotion = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const promotion = await PromotionModel.findOne({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();

    if (!promotion) {
      return reply.status(404).send({ success: false, message: 'No active promotion found' });
    }

    return {
      success: true,
      data: {
        id: promotion._id.toString(),
        title: promotion.title,
        subtitle: promotion.subtitle,
        videoUrl: promotion.videoUrl,
        thumbnailUrl: promotion.thumbnailUrl,
        features: promotion.features,
        buttonText: promotion.buttonText,
        secondaryButtonText: promotion.secondaryButtonText,
        isActive: promotion.isActive,
        order: promotion.order,
      },
    };
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};

const saveUploadedFile = async (part: any, folder: string) => {
  const uploadDir = path.join(__dirname, '../../uploads', folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const uniqueName = `${Date.now()}-${(part.filename || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(uploadDir, uniqueName);

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    part.file.pipe(writeStream);
    writeStream.on('finish', () => resolve(`/uploads/${folder}/${uniqueName}`));
    writeStream.on('error', reject);
  });
};

const deleteOldFile = (filePath: string) => {
  if (filePath && filePath.startsWith('/uploads/')) {
    const fullPath = path.join(__dirname, '../..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
};

export const createPromotion = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const parts = request.parts();
    const data: any = {
      features: [],
    };

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'title') data.title = part.value;
        if (part.fieldname === 'subtitle') data.subtitle = part.value;
        if (part.fieldname === 'videoUrl') data.videoUrl = part.value;
        if (part.fieldname === 'thumbnailUrl') data.thumbnailUrl = part.value;
        if (part.fieldname === 'buttonText') data.buttonText = part.value;
        if (part.fieldname === 'secondaryButtonText') data.secondaryButtonText = part.value;
        if (part.fieldname === 'isActive') data.isActive = part.value === 'true';
        if (part.fieldname === 'order') data.order = parseInt(part.value as string);
        if (part.fieldname.startsWith('features[')) {
          const match = part.fieldname.match(/features\[(\d+)\]\[(\w+)\]/);
          if (match) {
            const index = parseInt(match[1]);
            const field = match[2];
            if (!data.features[index]) {
              data.features[index] = {};
            }
            data.features[index][field] = part.value;
          }
        }
      } else if (part.type === 'file') {
        if (part.fieldname === 'thumbnailFile') {
          data.thumbnailUrl = await saveUploadedFile(part, 'thumbnails');
        } else if (part.fieldname === 'videoFile') {
          data.videoUrl = await saveUploadedFile(part, 'videos');
        }
      }
    }

    data.features = data.features.filter(Boolean);

    const promotion = new PromotionModel(data);
    await promotion.save();

    return reply.status(201).send({
      success: true,
      data: {
        id: promotion._id.toString(),
        title: promotion.title,
        subtitle: promotion.subtitle,
        videoUrl: promotion.videoUrl,
        thumbnailUrl: promotion.thumbnailUrl,
        features: promotion.features,
        buttonText: promotion.buttonText,
        secondaryButtonText: promotion.secondaryButtonText,
        isActive: promotion.isActive,
        order: promotion.order,
      },
    });
  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return reply.status(500).send({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const updatePromotion = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };

    const existingPromotion = await PromotionModel.findById(id);
    if (!existingPromotion) {
      return reply.status(404).send({ success: false, message: 'Promotion not found' });
    }

    const parts = request.parts();
    const data: any = {};

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'title') data.title = part.value;
        if (part.fieldname === 'subtitle') data.subtitle = part.value;
        if (part.fieldname === 'videoUrl') data.videoUrl = part.value;
        if (part.fieldname === 'thumbnailUrl') data.thumbnailUrl = part.value;
        if (part.fieldname === 'buttonText') data.buttonText = part.value;
        if (part.fieldname === 'secondaryButtonText') data.secondaryButtonText = part.value;
        if (part.fieldname === 'isActive') data.isActive = part.value === 'true';
        if (part.fieldname === 'order') data.order = parseInt(part.value as string);
        if (part.fieldname.startsWith('features[')) {
          if (!data.features) data.features = [];
          const match = part.fieldname.match(/features\[(\d+)\]\[(\w+)\]/);
          if (match) {
            const index = parseInt(match[1]);
            const field = match[2];
            if (!data.features[index]) {
              data.features[index] = {};
            }
            data.features[index][field] = part.value;
          }
        }
      } else if (part.type === 'file') {
        if (part.fieldname === 'thumbnailFile') {
          const thumbnailUrl = await saveUploadedFile(part, 'thumbnails');
          deleteOldFile(existingPromotion.thumbnailUrl);
          data.thumbnailUrl = thumbnailUrl;
        } else if (part.fieldname === 'videoFile') {
          const videoUrl = await saveUploadedFile(part, 'videos');
          deleteOldFile(existingPromotion.videoUrl);
          data.videoUrl = videoUrl;
        }
      }
    }

    if (data.features) {
      data.features = data.features.filter(Boolean);
    }

    const promotion = await PromotionModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();

    return {
      success: true,
      data: {
        id: promotion!._id.toString(),
        title: promotion!.title,
        subtitle: promotion!.subtitle,
        videoUrl: promotion!.videoUrl,
        thumbnailUrl: promotion!.thumbnailUrl,
        features: promotion!.features,
        buttonText: promotion!.buttonText,
        secondaryButtonText: promotion!.secondaryButtonText,
        isActive: promotion!.isActive,
        order: promotion!.order,
      },
    };
  } catch (error: any) {
    console.error('Error updating promotion:', error);
    return reply.status(500).send({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const deletePromotion = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const promotion = await PromotionModel.findByIdAndDelete(id);

    if (!promotion) {
      return reply.status(404).send({ success: false, message: 'Promotion not found' });
    }

    deleteOldFile(promotion.thumbnailUrl);
    deleteOldFile(promotion.videoUrl);

    return reply.status(200).send({
      success: true,
      message: 'Promotion deleted successfully',
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};
