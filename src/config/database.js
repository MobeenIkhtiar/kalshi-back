import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Use connection string if available, otherwise use individual parameters
const sequelize = process.env.DATABASE_URL 
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: true,
        dialectOptions: {
            ssl: process.env.NODE_ENV === 'production' ? {
                require: true,
                rejectUnauthorized: false
            } : false
        }
    })
    : new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            dialect: process.env.DB_DIALECT || 'postgres',
            port: process.env.DB_PORT || 5432,
            logging: true,
        }
    );


export default sequelize;