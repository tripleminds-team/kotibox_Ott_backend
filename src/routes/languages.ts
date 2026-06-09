import type { FastifyPluginAsync } from 'fastify';
import {
  listLanguages,
  getLanguage,
  createLanguage,
  updateLanguage,
  deleteLanguage,
} from '../controllers/languageController';

const languages: FastifyPluginAsync = async (fastify) => {
  // Get all languages (for users)
  fastify.get('/', listLanguages);
  // Get single language
  fastify.get('/:id', getLanguage);
  // Create language (admin only)
  fastify.post('/', createLanguage);
  // Update language (admin only)
  fastify.put('/:id', updateLanguage);
  // Delete language (admin only)
  fastify.delete('/:id', deleteLanguage);
};

export default languages;
