
import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserModel } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { ContentModel } from '../models/Content';
import { GenreModel } from '../models/Genre';

export const getDashboardStats = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const [
      totalUsers,
      activeSubscriptions,
      totalContent,
    ] = await Promise.all([
      UserModel.countDocuments(),
      SubscriptionModel.countDocuments({ status: 'active' }),
      ContentModel.countDocuments(),
    ]);

    const soonToExpire = await SubscriptionModel.countDocuments({
      endDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const totalSubscriptionRevenue = await SubscriptionModel.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const totalRevenue = totalSubscriptionRevenue[0]?.total || 0;

    return reply.send({
      success: true,
      data: {
        totalUsers,
        totalSubscribers: activeSubscriptions,
        soonToExpire,
        totalReviews: 71,
        totalStorageUsage: '292.55 MB',
        restContent: totalContent,
        subscriptionRevenue: `₹${totalRevenue.toFixed(2)}`,
        rentRevenue: '₹56.95',
        totalRevenue: `₹${(totalRevenue + 56.95).toFixed(2)}`,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const getRevenueData = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const query = request.query as { period?: string };
    const period = query.period || 'year';

    const revenueData = [
      { name: 'Jan', value: 15000 },
      { name: 'Feb', value: 12000 },
      { name: 'Mar', value: 18000 },
      { name: 'Apr', value: 25000 },
      { name: 'May', value: 22000 },
      { name: 'Jun', value: 28000 },
      { name: 'Jul', value: 26000 },
    ];

    return reply.send({
      success: true,
      data: revenueData,
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const getNewSubscribersData = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const query = request.query as { period?: string };
    const period = query.period || 'year';

    const newSubscribersData = [
      { name: 'Jan', basic: 120, premium: 80 },
      { name: 'Feb', basic: 132, premium: 95 },
      { name: 'Mar', basic: 101, premium: 88 },
      { name: 'Apr', basic: 134, premium: 110 },
      { name: 'May', basic: 90, premium: 78 },
      { name: 'Jun', basic: 230, premium: 150 },
    ];

    return reply.send({
      success: true,
      data: newSubscribersData,
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const getMostWatchedData = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const query = request.query as { period?: string };
    const period = query.period || 'year';

    const mostWatchedData = [
      { name: 'Jan', movies: 15, tvShows: 12 },
      { name: 'Feb', movies: 18, tvShows: 15 },
      { name: 'Mar', movies: 22, tvShows: 18 },
      { name: 'Apr', movies: 20, tvShows: 20 },
      { name: 'May', movies: 25, tvShows: 22 },
      { name: 'Jun', movies: 30, tvShows: 28 },
      { name: 'Jul', movies: 28, tvShows: 25 },
    ];

    return reply.send({
      success: true,
      data: mostWatchedData,
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const getTopGenresData = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const topGenresData = [
      { name: 'Horror', value: 25 },
      { name: 'Historical', value: 20 },
      { name: 'Inspirational', value: 18 },
      { name: 'Romantic', value: 22 },
      { name: 'Comedy', value: 15 },
    ];

    return reply.send({
      success: true,
      data: topGenresData,
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const getReviews = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const reviewsData = [
      {
        name: 'Dorothy Erickson',
        date: '3rd June 2026',
        category: 'TV Shows',
        rating: 5,
        avatar: 'D',
      },
      {
        name: 'Lila Lucas',
        date: '1st June 2026',
        category: 'TV Shows',
        rating: 4,
        avatar: 'L',
      },
      {
        name: 'Tracy Jones',
        date: '31st May 2026',
        category: 'TV Shows',
        rating: 5,
        avatar: 'T',
      },
      {
        name: 'Dorothy Erickson',
        date: '30th May 2026',
        category: 'TV Shows',
        rating: 5,
        avatar: 'D',
      },
      {
        name: 'Tracy Jones',
        date: '29th May 2026',
        category: 'TV Shows',
        rating: 4,
        avatar: 'T',
      },
      {
        name: 'Jay Henry',
        date: '28th May 2026',
        category: 'TV Shows',
        rating: 5,
        avatar: 'J',
      },
    ];

    return reply.send({
      success: true,
      data: reviewsData,
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};

export const getTransactions = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const transactionsData = [
      {
        name: 'Tristan Erikson',
        date: '2026-05-15',
        plan: 'Basic',
        amount: '₹500.00',
        duration: '1 month',
        method: 'Stripe',
        avatar: 'T',
      },
      {
        name: 'John Doe',
        date: '2026-05-11',
        plan: 'Premium Plan',
        amount: '₹2000.00',
        duration: '3 months',
        method: 'Stripe',
        avatar: 'J',
      },
      {
        name: 'Lila Lucas',
        date: '2026-05-10',
        plan: 'Premium Plan',
        amount: '₹1000.00',
        duration: '1 month',
        method: '-',
        avatar: 'L',
      },
      {
        name: 'Dorothy Erickson',
        date: '-',
        plan: 'Basic',
        amount: '₹500.00',
        duration: '1 month',
        method: '-',
        avatar: 'D',
      },
      {
        name: 'Sinika Green',
        date: '2026-05-06',
        plan: 'Premium Plan',
        amount: '₹1000.00',
        duration: '1 month',
        method: 'Stripe',
        avatar: 'S',
      },
      {
        name: 'Fefe Harris',
        date: '2026-05-08',
        plan: 'Premium Plan',
        amount: '₹1000.00',
        duration: '1 month',
        method: '-',
        avatar: 'F',
      },
    ];

    return reply.send({
      success: true,
      data: transactionsData,
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, error: error.message });
  }
};
