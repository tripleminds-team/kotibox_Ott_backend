import type { FastifyPluginAsync } from 'fastify';
import {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  updateMovieStatus,
  toggleFeatured,
  toggleTrending,
  getPendingApprovals,
  approveMovie,
  rejectMovie,
} from '../controllers/movieController';
import { authenticate } from '../middlewares/auth';

const movie: FastifyPluginAsync = async (fastify) => {
  // Get all movies with pagination and filtering
  fastify.get('/', getAllMovies);

  // Get pending approvals (MUST be registered before /:id)
  fastify.get('/pending-approvals', { onRequest: [authenticate] }, getPendingApprovals);

  // Create new movie
  fastify.post('/', createMovie);

  // Approve movie
  fastify.post('/item/:id/approve', { onRequest: [authenticate] }, approveMovie);

  // Reject movie
  fastify.post('/item/:id/reject', { onRequest: [authenticate] }, rejectMovie);

  // Get single movie by ID
  fastify.get('/:id', getMovieById);

  // Update movie by ID
  fastify.put('/:id', updateMovie);

  // Delete movie by ID
  fastify.delete('/:id', deleteMovie);

  // Update movie status
  fastify.patch('/:id/status', updateMovieStatus);

  // Toggle featured status
  fastify.patch('/:id/featured', toggleFeatured);

  // Toggle trending status
  fastify.patch('/:id/trending', toggleTrending);
};

export default movie;
