import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { unauthorizedResponse, serverErrorResponse } from '../utils/responses.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return unauthorizedResponse(res, 'Access token required');
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if user still exists
        const user = await User.findByPk(decoded.userId);
        
        if (!user) {
            return unauthorizedResponse(res, 'Invalid token - user not found');
        }

        // Add user ID to request object
        req.userId = user.id;
        req.user = user;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return unauthorizedResponse(res, 'Invalid token');
        }
        
        if (error.name === 'TokenExpiredError') {
            return unauthorizedResponse(res, 'Token expired');
        }

        console.error('Auth middleware error:', error);
        return serverErrorResponse(res, 'Internal server error');
    }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findByPk(decoded.userId);
            
            if (user) {
                req.userId = user.id;
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // Ignore auth errors for optional auth
        next();
    }
};
