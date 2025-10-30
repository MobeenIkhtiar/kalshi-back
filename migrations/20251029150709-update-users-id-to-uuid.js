'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up (queryInterface, Sequelize) {
    // Get the actual constraint name
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY';
    `);
    
    const constraintName = constraints[0]?.constraint_name;
    
    if (constraintName) {
      // Drop the existing primary key constraint
      await queryInterface.removeConstraint('users', constraintName);
    }
    
    // Add a new UUID column
    await queryInterface.addColumn('users', 'new_id', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false
    });
    
    // Update existing records with new UUIDs
    await queryInterface.sequelize.query(`
      UPDATE users SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    `);
    
    // Drop the old id column
    await queryInterface.removeColumn('users', 'id');
    
    // Rename new_id to id
    await queryInterface.renameColumn('users', 'new_id', 'id');
    
    // Add the primary key constraint back
    await queryInterface.addConstraint('users', {
      fields: ['id'],
      type: 'primary key',
      name: 'users_pkey'
    });
  },

  async down (queryInterface, Sequelize) {
    // Get the actual constraint name
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY';
    `);
    
    const constraintName = constraints[0]?.constraint_name;
    
    if (constraintName) {
      // Drop the primary key constraint
      await queryInterface.removeConstraint('users', constraintName);
    }
    
    // Add a new INTEGER column
    await queryInterface.addColumn('users', 'new_id', {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false
    });
    
    // Update existing records with sequential IDs
    await queryInterface.sequelize.query(`
      UPDATE users SET new_id = row_number() OVER (ORDER BY created_at);
    `);
    
    // Drop the old id column
    await queryInterface.removeColumn('users', 'id');
    
    // Rename new_id to id
    await queryInterface.renameColumn('users', 'new_id', 'id');
    
    // Add the primary key constraint back
    await queryInterface.addConstraint('users', {
      fields: ['id'],
      type: 'primary key',
      name: 'users_pkey'
    });
  }
};
