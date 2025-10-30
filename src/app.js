import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import kalshiRoutes from './routes/kalshi.routes.js';
import authRoutes from './routes/auth.routes.js';
import kalshiConnectionRoutes from './routes/kalshi-connection.routes.js';
import User from './models/User.js';
import { successResponse } from './utils/responses.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    return successResponse(res, 'PERN backend running with Sequelize ORM 🚀');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/kalshi', kalshiRoutes);
app.use('/api/kalshi-connection', kalshiConnectionRoutes);

// Connect to DB and sync models
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully (Sequelize)');
        
        // Sync models with database (create tables if they don't exist)
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
    }
})();

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
