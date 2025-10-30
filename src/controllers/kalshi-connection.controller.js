import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { successResponse, badRequestResponse, unauthorizedResponse, serverErrorResponse } from '../utils/responses.js';

dotenv.config();

const KALSHI_BASE_URL = process.env.KALSHI_BASE_URL || 'https://demo-api.kalshi.co/trade-api/v2';

/**
 * Verify Kalshi connection by testing the credentials
 */
export const verifyKalshiConnection = async (req, res) => {
    try {
        const { kalshi_access_key_id, kalshi_private_key } = req.body;
        const userId = req.userId;

        if (!kalshi_access_key_id || !kalshi_private_key) {
            return badRequestResponse(res, 'Kalshi Access Key ID and Private Key are required');
        }

        // Test the connection to Kalshi API
        const testResponse = await testKalshiConnection(kalshi_access_key_id, kalshi_private_key);

        if (!testResponse.success) {
            return badRequestResponse(res, testResponse.message);
        }

        // Update user's Kalshi credentials in database
        const user = await User.findByPk(userId);
        if (!user) {
            return unauthorizedResponse(res, 'User not found');
        }

        await user.update({
            kalshi_access_key_id,
            kalshi_private_key
        });

        return successResponse(res, 'Kalshi connection verified successfully', {
            user: user.toJSON(),
            kalshi_status: 'connected',
            isConnectionSuccessful: testResponse.success
        });

    } catch (error) {
        console.error('Kalshi connection verification error:', error);
        return serverErrorResponse(res, 'Failed to verify Kalshi connection');
    }
};

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
 * Test Kalshi API connection with the provided credentials
 */
const testKalshiConnection = async (accessKeyId, privateKey) => {
    try {
        const method = 'GET';
        const path = '/portfolio/balance';
        const timestamp = Date.now().toString();

        // Generate signature
        const signature = generateKalshiSignature(method, `/trade-api/v2${path}`, '', timestamp, privateKey);

        // Make the API call with proper Kalshi headers
        const response = await axios.get(`${KALSHI_BASE_URL}${path}`, {
            headers: {
                'KALSHI-ACCESS-KEY': accessKeyId,
                'KALSHI-ACCESS-SIGNATURE': signature,
                'KALSHI-ACCESS-TIMESTAMP': timestamp,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        if (response.status === 200) {
            return {
                success: true,
                message: 'Kalshi connection successful',
                data: response.data
            };
        } else {
            return {
                success: false,
                message: 'Invalid Kalshi credentials'
            };
        }

    } catch (error) {
        console.error('Kalshi API test error:', error);

        if (error.response?.status === 401) {
            return {
                success: false,
                message: 'Invalid Kalshi credentials. Please check your Access Key ID and Private Key.'
            };
        } else if (error.response?.status === 403) {
            return {
                success: false,
                message: 'Kalshi credentials are valid but lack required permissions.'
            };
        } else if (error.code === 'ECONNABORTED') {
            return {
                success: false,
                message: 'Connection timeout. Please check your internet connection and try again.'
            };
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                success: false,
                message: 'Unable to connect to Kalshi API. Please try again later.'
            };
        } else if (error.message === 'Failed to generate signature') {
            return {
                success: false,
                message: 'Invalid private key format. Please ensure your private key is valid base64 or PEM format.'
            };
        } else {
            return {
                success: false,
                message: 'Failed to verify Kalshi connection. Please check your credentials and try again.'
            };
        }
    }
};

/**
 * Get member balance and portfolio value from Kalshi
 */
export const getKalshiBalance = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        if (!user || !user.kalshi_access_key_id || !user.kalshi_private_key) {
            return unauthorizedResponse(res, 'Kalshi credentials not configured');
        }

        const method = 'GET';
        const path = '/portfolio/balance';
        const timestamp = Date.now().toString();
        const signature = generateKalshiSignature(method, `/trade-api/v2${path}`, '', timestamp, user.kalshi_private_key);

        const response = await axios.get(`${KALSHI_BASE_URL}${path}`, {
            headers: {
                'KALSHI-ACCESS-KEY': user.kalshi_access_key_id,
                'KALSHI-ACCESS-SIGNATURE': signature,
                'KALSHI-ACCESS-TIMESTAMP': timestamp,
            },
            timeout: 10000
        });

        return successResponse(res, 'Kalshi balance retrieved', response.data);
    } catch (error) {
        console.error('Get Kalshi balance error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return unauthorizedResponse(res, 'Kalshi authentication failed');
        }
        return serverErrorResponse(res, 'Failed to fetch balance from Kalshi');
    }
};

/**
 * Get Kalshi connection status for the current user
 */
export const getKalshiStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);

        if (!user) {
            return unauthorizedResponse(res, 'User not found');
        }

        const hasKalshiCredentials = !!(user.kalshi_access_key_id && user.kalshi_private_key);
        let connectionStatus = 'disconnected';

        if (hasKalshiCredentials) {
            // Test the existing connection
            const testResult = await testKalshiConnection(user.kalshi_access_key_id, user.kalshi_private_key);
            connectionStatus = testResult.success ? 'connected' : 'invalid';
        }

        return successResponse(res, 'Kalshi status retrieved successfully', {
            kalshi_status: connectionStatus,
            has_credentials: hasKalshiCredentials,
            access_key_preview: hasKalshiCredentials ? `${user.kalshi_access_key_id.substring(0, 8)}...${user.kalshi_access_key_id.substring(user.kalshi_access_key_id.length - 4)}` : null
        });

    } catch (error) {
        console.error('Get Kalshi status error:', error);
        return serverErrorResponse(res, 'Failed to get Kalshi status');
    }
};

/**
 * Disconnect Kalshi by clearing the credentials
 */
export const disconnectKalshi = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);

        if (!user) {
            return unauthorizedResponse(res, 'User not found');
        }

        await user.update({
            kalshi_access_key_id: null,
            kalshi_private_key: null
        });

        return successResponse(res, 'Kalshi disconnected successfully', {
            user: user.toJSON(),
            kalshi_status: 'disconnected'
        });

    } catch (error) {
        console.error('Disconnect Kalshi error:', error);
        return serverErrorResponse(res, 'Failed to disconnect Kalshi');
    }
};

/**
 * Retrieve stored Kalshi credentials for the authenticated user
 */
export const getKalshiCredentials = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);

        if (!user) {
            return unauthorizedResponse(res, 'User not found');
        }

        return successResponse(res, 'Kalshi credentials retrieved successfully', {
            kalshi_access_key_id: user.kalshi_access_key_id || null,
            kalshi_private_key: user.kalshi_private_key || null
        });
    } catch (error) {
        console.error('Get Kalshi credentials error:', error);
        return serverErrorResponse(res, 'Failed to fetch Kalshi credentials');
    }
};
