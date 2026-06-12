import type { FastifyPluginAsync } from 'fastify';
import {
  getFolders,
  createFolder,
  deleteFolder,
  getFilesByFolder,
  getAllMediaFiles,
  uploadFilesToFolder,
  deleteFile,
  seedDefaultFolders,
} from '../controllers/mediaController';

const media: FastifyPluginAsync = async (fastify) => {
  // Seed default folders on startup
  seedDefaultFolders().catch((err) => console.error('Error seeding media folders:', err));

  // Folder routes
  fastify.get('/folders', getFolders);
  fastify.post('/folders', createFolder);
  fastify.delete('/folders/:id', deleteFolder);

  // File routes
  fastify.get('/folders/:id/files', getFilesByFolder);
  fastify.get('/files/all', getAllMediaFiles);
  fastify.post('/folders/:id/files', uploadFilesToFolder);
  fastify.delete('/files/:id', deleteFile);
};

export default media;
