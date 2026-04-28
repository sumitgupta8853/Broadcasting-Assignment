require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('password123', 12);

    // Seed principal
    await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Principal Admin', 'principal@school.com', $1, 'principal')
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash]);

    // Seed teachers
    const teachers = [
      { name: 'Teacher One', email: 'teacher1@school.com' },
      { name: 'Teacher Two', email: 'teacher2@school.com' },
      { name: 'Teacher Three', email: 'teacher3@school.com' },
    ];

    for (const t of teachers) {
      await client.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, 'teacher')
        ON CONFLICT (email) DO NOTHING;
      `, [t.name, t.email, passwordHash]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully');
    console.log('');
    console.log('Demo Credentials:');
    console.log('  Principal: principal@school.com / password123');
    console.log('  Teacher 1: teacher1@school.com  / password123');
    console.log('  Teacher 2: teacher2@school.com  / password123');
    console.log('  Teacher 3: teacher3@school.com  / password123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch(console.error);
