import express from 'express';
import { 
    addToWatchlist, 
    removeFromWatchlist, 
    getWatchlist,
    checkWatchlistStatus 
} from '../controllers/watchlist.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user's watchlist
router.get('/', getWatchlist);

// Check if market is in watchlist
router.get('/:ticker', checkWatchlistStatus);

// Add market to watchlist
router.post('/', addToWatchlist);

// Remove market from watchlist
router.delete('/:ticker', removeFromWatchlist);

export default router;

