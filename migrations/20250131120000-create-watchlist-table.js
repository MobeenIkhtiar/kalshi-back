'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('watchlist', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      market_ticker: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add unique constraint to prevent duplicate entries
    await queryInterface.addIndex('watchlist', ['user_id', 'market_ticker'], {
      unique: true,
      name: 'watchlist_user_ticker_unique'
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('watchlist', ['user_id']);
    await queryInterface.addIndex('watchlist', ['market_ticker']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('watchlist');
  }
};

