import axios from 'axios';
import dotenv from 'dotenv';
import {
    successResponse,
    badRequestResponse,
    notFoundResponse,
    serverErrorResponse
} from '../utils/responses.js';

dotenv.config();

const KALSHI_BASE_URL = process.env.KALSHI_BASE_URL || 'https://api.elections.kalshi.com/trade-api/v2';

/**
 * Get Market by Ticker
 * GET /markets/{ticker}
 * Endpoint for getting data about a specific market by its ticker.
 * A market represents a specific binary outcome within an event that users can trade on.
 */
export const getMarket = async (req, res) => {
    try {
        const { ticker } = req.params;
        
        if (!ticker) {
            return badRequestResponse(res, 'Ticker parameter is required');
        }

        // Make request to Kalshi API
        const response = await axios.get(`${KALSHI_BASE_URL}/markets/${ticker}`, {
            timeout: 10000 // 10 second timeout
        });
        
        // Return the market data as received from Kalshi API
        return successResponse(res, 'Market retrieved successfully', {
            market: response.data.market
        });
        
    } catch (error) {
        console.error('Error fetching market:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            return notFoundResponse(res, 'Market not found');
        }
        
        if (error.response?.status === 400) {
            return badRequestResponse(res, error.response?.data?.message || 'Invalid request');
        }
        
        return serverErrorResponse(res, 'Failed to fetch market');
    }
};

