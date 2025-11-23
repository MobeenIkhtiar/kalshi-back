import express from 'express';
import { getOrders } from '../controllers/orders.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get order history
router.get('/', getOrders);

export default router;

