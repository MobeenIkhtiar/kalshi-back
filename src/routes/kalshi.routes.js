import express from 'express';
import { getAllMarkets, getMarketByTicker } from '../controllers/kalshi.controller.js';

const router = express.Router();

router.get('/markets', getAllMarkets);

router.get('/markets/:ticker', getMarketByTicker);

export default router;
