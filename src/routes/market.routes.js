import express from 'express';
import { getMarket } from '../controllers/market.controller.js';

const router = express.Router();

// Get market by ticker
router.get('/:ticker', getMarket);

export default router;

