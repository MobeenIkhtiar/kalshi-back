'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'kalshi_access_key_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('users', 'kalshi_private_key', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'kalshi_access_key_id');
    await queryInterface.removeColumn('users', 'kalshi_private_key');
  }
};
