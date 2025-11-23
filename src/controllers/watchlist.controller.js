import Watchlist from '../models/Watchlist.js';
import User from '../models/User.js';
import axios from 'axios';
import dotenv from 'dotenv';
import {
    successResponse,
    badRequestResponse,
    unauthorizedResponse,
    notFoundResponse,
    conflictResponse,
    serverErrorResponse
} from '../utils/responses.js';

dotenv.config();

const KALSHI_BASE_URL = process.env.KALSHI_BASE_URL || 'https://api.elections.kalshi.com/trade-api/v2';

/**
 * Add market to watchlist
 * POST /api/watchlist
 */
export const addToWatchlist = async (req, res) => {
    try {
        const userId = req.userId;
        const { market_ticker } = req.body;

        if (!market_ticker) {
            return badRequestResponse(res, 'market_ticker is required');
        }

        // Check if market exists in Kalshi (optional validation)
        try {
            await axios.get(`${KALSHI_BASE_URL}/markets/${market_ticker}`, {
                timeout: 5000
            });
        } catch (error) {
            if (error.response?.status === 404) {
                return notFoundResponse(res, 'Market not found');
            }
            // Continue even if validation fails (network issues, etc.)
        }

        // Check if already in watchlist
        const existing = await Watchlist.findOne({
            where: {
                user_id: userId,
                market_ticker: market_ticker
            }
        });

        if (existing) {
            return conflictResponse(res, 'Market is already in your watchlist');
        }

        // Add to watchlist
        const watchlistItem = await Watchlist.create({
            user_id: userId,
            market_ticker: market_ticker
        });

        return successResponse(res, 'Market added to watchlist successfully', {
            watchlist: watchlistItem
        });

    } catch (error) {
        console.error('Add to watchlist error:', error);
        
        // Handle unique constraint violation
        if (error.name === 'SequelizeUniqueConstraintError') {
            return conflictResponse(res, 'Market is already in your watchlist');
        }
        
        return serverErrorResponse(res, 'Failed to add market to watchlist');
    }
};

/**
 * Remove market from watchlist
 * DELETE /api/watchlist/:ticker
 */
export const removeFromWatchlist = async (req, res) => {
    try {
        const userId = req.userId;
        const { ticker } = req.params;

        if (!ticker) {
            return badRequestResponse(res, 'Ticker parameter is required');
        }

        // Find and delete the watchlist item
        const watchlistItem = await Watchlist.findOne({
            where: {
                user_id: userId,
                market_ticker: ticker
            }
        });

        if (!watchlistItem) {
            return notFoundResponse(res, 'Market not found in your watchlist');
        }

        await watchlistItem.destroy();

        return successResponse(res, 'Market removed from watchlist successfully');

    } catch (error) {
        console.error('Remove from watchlist error:', error);
        return serverErrorResponse(res, 'Failed to remove market from watchlist');
    }
};

/**
 * Get user's watchlist
 * GET /api/watchlist
 */
export const getWatchlist = async (req, res) => {
    try {
        const userId = req.userId;

        // Get all watchlist items for the user
        const watchlistItems = await Watchlist.findAll({
            where: {
                user_id: userId
            },
            order: [['createdAt', 'DESC']]
        });

        // Extract tickers
        const tickers = watchlistItems.map(item => item.market_ticker);

        // Fetch market data from Kalshi for each ticker
        const markets = [];
        const errors = [];

        for (const ticker of tickers) {
            try {
                const response = await axios.get(`${KALSHI_BASE_URL}/markets/${ticker}`, {
                    timeout: 5000
                });
                markets.push({
                    ticker: ticker,
                    market: response.data.market,
                    addedAt: watchlistItems.find(item => item.market_ticker === ticker)?.createdAt
                });
            } catch (error) {
                // If market doesn't exist or is unavailable, still include it in the list
                errors.push({
                    ticker: ticker,
                    error: error.response?.status === 404 ? 'Market not found' : 'Failed to fetch market data'
                });
                markets.push({
                    ticker: ticker,
                    market: null,
                    addedAt: watchlistItems.find(item => item.market_ticker === ticker)?.createdAt,
                    error: error.response?.status === 404 ? 'Market not found' : 'Failed to fetch market data'
                });
            }
        }

        return successResponse(res, 'Watchlist retrieved successfully', {
            watchlist: markets,
            count: markets.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Get watchlist error:', error);
        return serverErrorResponse(res, 'Failed to fetch watchlist');
    }
};

/**
 * Check if market is in watchlist
 * GET /api/watchlist/:ticker
 */
export const checkWatchlistStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const { ticker } = req.params;

        if (!ticker) {
            return badRequestResponse(res, 'Ticker parameter is required');
        }

        const watchlistItem = await Watchlist.findOne({
            where: {
                user_id: userId,
                market_ticker: ticker
            }
        });

        return successResponse(res, 'Watchlist status retrieved', {
            isInWatchlist: !!watchlistItem,
            ticker: ticker
        });

    } catch (error) {
        console.error('Check watchlist status error:', error);
        return serverErrorResponse(res, 'Failed to check watchlist status');
    }
};

