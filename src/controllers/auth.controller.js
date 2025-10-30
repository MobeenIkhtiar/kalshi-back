import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User.js';
import dotenv from 'dotenv';
import { successResponse, createdResponse, badRequestResponse, unauthorizedResponse, notFoundResponse, conflictResponse, serverErrorResponse } from '../utils/responses.js';

dotenv.config();

// JWT Secret - In production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Register User
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return badRequestResponse(res, 'Username, email, and password are required');
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { username: username }
                ]
            }
        });

        if (existingUser) {
            return conflictResponse(res, existingUser.email === email
                ? 'Email already registered'
                : 'Username already taken'
            );
        }

        // Create new user
        const user = await User.create({
            username,
            email,
            password
        });

        // Generate token
        const token = generateToken(user.id);

        return createdResponse(res, 'User registered successfully', {
            user: user.toJSON(),
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        return serverErrorResponse(res, 'Internal server error during registration');
    }
};

// Login User
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return badRequestResponse(res, 'Email and password are required');
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return unauthorizedResponse(res, 'Invalid email or password');
        }

        // Check password
        const isPasswordValid = await user.checkPassword(password);

        if (!isPasswordValid) {
            return unauthorizedResponse(res, 'Invalid email or password');
        }

        // Generate token
        const token = generateToken(user.id);

        return successResponse(res, 'Login successful', {
            user: user.toJSON(),
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        return serverErrorResponse(res, 'Internal server error during login');
    }
};

// Get Current User Profile
export const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);

        if (!user) {
            return notFoundResponse(res, 'User not found');
        }

        return successResponse(res, 'Profile retrieved successfully', {
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Get profile error:', error);
        return serverErrorResponse(res, 'Internal server error');
    }
};

// Update User Profile
export const updateProfile = async (req, res) => {
    try {
        const { username, email, kalshi_secret_key } = req.body;
        const userId = req.userId;

        const user = await User.findByPk(userId);

        if (!user) {
            return notFoundResponse(res, 'User not found');
        }

        // Check if username or email already exists (excluding current user)
        if (username || email) {
            const existingUser = await User.findOne({
                where: {
                    [Op.or]: [
                        ...(username ? [{ username }] : []),
                        ...(email ? [{ email }] : [])
                    ],
                    id: { [Op.ne]: userId }
                }
            });

            if (existingUser) {
                return conflictResponse(res, existingUser.username === username
                    ? 'Username already taken'
                    : 'Email already registered'
                );
            }
        }

        // Update user
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (kalshi_secret_key !== undefined) updateData.kalshi_secret_key = kalshi_secret_key;

        await user.update(updateData);

        return successResponse(res, 'Profile updated successfully', {
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return serverErrorResponse(res, 'Internal server error');
    }
};

// Change Password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.userId;

        if (!currentPassword || !newPassword) {
            return badRequestResponse(res, 'Current password and new password are required');
        }

        if (newPassword.length < 6) {
            return badRequestResponse(res, 'New password must be at least 6 characters long');
        }

        const user = await User.findByPk(userId);

        if (!user) {
            return notFoundResponse(res, 'User not found');
        }

        // Verify current password
        const isCurrentPasswordValid = await user.checkPassword(currentPassword);

        if (!isCurrentPasswordValid) {
            return unauthorizedResponse(res, 'Current password is incorrect');
        }

        // Update password
        await user.update({ password: newPassword });

        return successResponse(res, 'Password changed successfully');

    } catch (error) {
        console.error('Change password error:', error);
        return serverErrorResponse(res, 'Internal server error');
    }
};
