import express from 'express';
import { verifyKalshiConnection, getKalshiStatus, disconnectKalshi, getKalshiBalance, getKalshiCredentials } from '../controllers/kalshi-connection.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Verify Kalshi connection
router.post('/verify', verifyKalshiConnection);

// Get Kalshi connection status
router.get('/status', getKalshiStatus);

// Disconnect Kalshi
router.delete('/disconnect', disconnectKalshi);

// Get balance and portfolio value
router.get('/balance', getKalshiBalance);

// Get stored credentials
router.get('/credentials', getKalshiCredentials);

export default router;
