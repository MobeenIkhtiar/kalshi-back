import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { 
    successResponse, 
    unauthorizedResponse, 
    serverErrorResponse,
    badRequestResponse 
} from '../utils/responses.js';

dotenv.config();

const KALSHI_BASE_URL = process.env.KALSHI_BASE_URL || 'https://api.elections.kalshi.com/trade-api/v2';

/**
 * Generate Kalshi API signature for authentication
 */
const generateKalshiSignature = (method, pathToSign, body, timestamp, privateKey) => {
    try {
        // Kalshi expects: timestamp + METHOD + path (no query string)
        const cleanPath = pathToSign.split('?')[0];
        const stringToSign = `${timestamp}${method.toUpperCase()}${cleanPath}`;

        // Format the private key properly if it's missing PEM headers
        let formattedPrivateKey = privateKey;
        if (!privateKey.includes('BEGIN')) {
            // Try PKCS#1 format first (RSA PRIVATE KEY) - most common for Kalshi
            formattedPrivateKey = `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;
        }

        // Create RSA-PSS-SHA256 signature per Kalshi docs
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(stringToSign, 'utf8');

        // Sign with the private key using PSS padding
        const signature = sign.sign({
            key: formattedPrivateKey,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
        }, 'base64');

        return signature;
    } catch (error) {
        console.error('Error generating Kalshi signature:', error);
        throw new Error('Failed to generate signature');
    }
};

/**
 * Get order history from Kalshi
 * GET /portfolio/orders
 */
export const getOrders = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        
        if (!user || !user.kalshi_access_key_id || !user.kalshi_private_key) {
            return unauthorizedResponse(res, 'Kalshi credentials not configured');
        }

        // Extract query parameters
        const { 
            ticker, 
            event_ticker, 
            min_ts, 
            max_ts, 
            status, 
            limit = 100,
            cursor 
        } = req.query;

        // Validate limit parameter (1 <= limit <= 200)
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return badRequestResponse(res, 'Limit must be between 1 and 200');
        }

        // Build query parameters
        const queryParams = new URLSearchParams();
        if (ticker) queryParams.append('ticker', ticker);
        if (event_ticker) queryParams.append('event_ticker', event_ticker);
        if (min_ts) queryParams.append('min_ts', min_ts);
        if (max_ts) queryParams.append('max_ts', max_ts);
        if (status) queryParams.append('status', status);
        if (limitNum) queryParams.append('limit', limitNum.toString());
        if (cursor) queryParams.append('cursor', cursor);

        const queryString = queryParams.toString();
        const path = `/portfolio/orders${queryString ? `?${queryString}` : ''}`;
        const method = 'GET';
        const timestamp = Date.now().toString();

        // Generate signature (path should include /trade-api/v2 prefix for signing)
        const signature = generateKalshiSignature(
            method, 
            `/trade-api/v2${path}`, 
            '', 
            timestamp, 
            user.kalshi_private_key
        );

        // Make the API call to Kalshi
        const response = await axios.get(`${KALSHI_BASE_URL}${path}`, {
            headers: {
                'KALSHI-ACCESS-KEY': user.kalshi_access_key_id,
                'KALSHI-ACCESS-SIGNATURE': signature,
                'KALSHI-ACCESS-TIMESTAMP': timestamp,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        return successResponse(res, 'Orders retrieved successfully', {
            orders: response.data.orders || [],
            cursor: response.data.cursor || null
        });

    } catch (error) {
        console.error('Get orders error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            return unauthorizedResponse(res, 'Kalshi authentication failed');
        }
        
        if (error.response?.status === 400) {
            return badRequestResponse(res, error.response?.data?.message || 'Invalid request parameters');
        }
        
        if (error.response?.status === 403) {
            return unauthorizedResponse(res, 'Kalshi credentials lack required permissions');
        }
        
        return serverErrorResponse(res, 'Failed to fetch orders from Kalshi');
    }
};

