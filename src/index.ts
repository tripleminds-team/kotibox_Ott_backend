
// Load .env file
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env') });

import fastify from './app';
import { logger } from './lib/logger';
import { connectMongoDB } from './lib/mongodb';
import { connectRedis } from './lib/redis';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error('PORT environment variable is required but was not provided.');
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer() {
  try {
    await Promise.all([connectMongoDB(), connectRedis()]);

    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info({ port }, 'Server listening');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

startServer();

