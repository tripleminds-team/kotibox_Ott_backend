import type { FastifyReply, FastifyRequest } from 'fastify';
import { LanguageModel } from '../models/Language';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const saveFileStream = (part: any, folder: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(__dirname, '../../uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const uniqueName = `${Date.now()}-${(part.filename || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, uniqueName);
    const writeStream = fs.createWriteStream(filePath);
    part.file.pipe(writeStream);
    writeStream.on('finish', () => resolve(`/uploads/${folder}/${uniqueName}`));
    writeStream.on('error', reject);
  });
};

export const listLanguages = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const query = request.query as { includeSkip?: string };
    const includeSkip = query.includeSkip === 'true';

    const languages = await LanguageModel.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();

    const filteredLanguages = languages.map(lang => ({
      id: lang._id.toString(),
      name: lang.name,
      code: lang.code,
      image: lang.image,
      isActive: lang.isActive,
      order: lang.order,
      createdAt: lang.createdAt,
      updatedAt: lang.updatedAt
    }));

    const data = includeSkip
      ? [
          {
            id: 'skip',
            name: 'Skip',
            code: 'skip',
            image: null,
            isActive: true,
            order: -1,
            createdAt: null,
            updatedAt: null,
            isSkippable: true,
          },
          ...filteredLanguages,
        ]
      : filteredLanguages;

    return {
      success: true,
      data
    };
  } catch (error: any) {
    console.error('Error in listLanguages:', error);
    return reply.status(500).send({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const getLanguage = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const language = await LanguageModel.findById(id).lean();

    if (!language) {
      return reply.status(404).send({ success: false, message: 'Language not found' });
    }

    return {
      success: true,
      data: {
        id: language._id.toString(),
        name: language.name,
        code: language.code,
        image: language.image,
        isActive: language.isActive,
        order: language.order,
        createdAt: language.createdAt,
        updatedAt: language.updatedAt
      }
    };
  } catch (error) {
    console.error('Error getting language:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};

export const createLanguage = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const parts = request.parts();
    let name: string | undefined;
    let code: string | undefined;
    let imagePath: string | undefined;

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'name') name = part.value as string;
        if (part.fieldname === 'code') code = part.value as string;
      } else if (part.type === 'file') {
        imagePath = await saveFileStream(part, 'languages');
      }
    }

    if (!name || !code) {
      return reply.status(400).send({
        success: false,
        message: 'Name and code are required'
      });
    }

    const language = new LanguageModel({ name, code, image: imagePath });
    await language.save();

    return reply.status(201).send({
      success: true,
      data: {
        id: language._id.toString(),
        name: language.name,
        code: language.code,
        image: language.image,
        isActive: language.isActive,
        order: language.order
      }
    });
  } catch (error: any) {
    console.error('Error creating language:', error.message, error.stack);
    return reply.status(500).send({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

export const updateLanguage = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    
    const parts = request.parts();
    const updateData: any = {};
    let oldImage: string | undefined;

    const existingLang = await LanguageModel.findById(id);
    if (!existingLang) {
      return reply.status(404).send({ success: false, message: 'Language not found' });
    }
    oldImage = existingLang.image;

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'name') updateData.name = part.value;
        if (part.fieldname === 'code') updateData.code = part.value;
        if (part.fieldname === 'isActive') updateData.isActive = part.value === 'true';
        if (part.fieldname === 'order') updateData.order = parseInt(part.value as string);
      } else if (part.type === 'file') {
        updateData.image = await saveFileStream(part, 'languages');
        
        // Delete old image if it exists
        if (oldImage && oldImage.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '../..', oldImage);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }
    }

    const language = await LanguageModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!language) {
      return reply.status(404).send({ success: false, message: 'Language not found' });
    }

    return {
      success: true,
      data: {
        id: language._id.toString(),
        name: language.name,
        code: language.code,
        image: language.image,
        isActive: language.isActive,
        order: language.order
      }
    };
  } catch (error) {
    console.error('Error updating language:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};

export const deleteLanguage = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const language = await LanguageModel.findById(id);

    if (!language) {
      return reply.status(404).send({ success: false, message: 'Language not found' });
    }

    // Delete image file if it exists
    if (language.image && language.image.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '../..', language.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await LanguageModel.findByIdAndDelete(id);

    return reply.status(200).send({
      success: true,
      message: 'Language deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting language:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};
