import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const Watchlist = sequelize.define('Watchlist', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    market_ticker: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    }
}, {
    tableName: 'watchlist',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'market_ticker'],
            name: 'watchlist_user_ticker_unique'
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['market_ticker']
        }
    ]
});

// Define associations
Watchlist.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

User.hasMany(Watchlist, {
    foreignKey: 'user_id',
    as: 'watchlist'
});

export default Watchlist;

