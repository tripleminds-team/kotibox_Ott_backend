import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyCompress from '@fastify/compress';
import path from 'path';
import { fileURLToPath } from 'url';
import router from './routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true,
  bodyLimit: 2000 * 1024 * 1024 // 2GB
});

// Enable compression for faster responses
fastify.register(fastifyCompress, {
  global: true,
  encodings: ['gzip', 'deflate', 'br']
});

// Enable CORS
fastify.register(fastifyCors, {
  origin: true,
  credentials: true,
});

// Register JWT plugin
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'fallback-secret-for-development-only'
});

// Register Multipart for file uploads with optimized config
fastify.register(fastifyMultipart as any, {
  limits: {
    fileSize: 2000 * 1024 * 1024, // 2GB
    files: 10 // Max files per request
  }
});

// Register Static file serving
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../uploads'),
  prefix: '/uploads/'
});

// Register all routes
fastify.register(router, { prefix: '/api' });

export default fastify;
