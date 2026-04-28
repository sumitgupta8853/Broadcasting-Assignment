require('dotenv').config();
const { pool } = require('../config/database');

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('principal', 'teacher')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    
    await client.query(`
      CREATE TABLE IF NOT EXISTS content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        subject VARCHAR(100) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(20) NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        rejection_reason TEXT,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        start_time TIMESTAMPTZ,
        end_time TIMESTAMPTZ,
        rotation_duration INTEGER DEFAULT 5,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Content slots (subject-based grouping)
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_slots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(teacher_id, subject)
      );
    `);

    // Content schedule (rotation order per slot)
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_schedule (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
        slot_id UUID NOT NULL REFERENCES content_slots(id) ON DELETE CASCADE,
        rotation_order INTEGER NOT NULL,
        duration INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(slot_id, rotation_order)
      );
    `);

    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_uploaded_by ON content(uploaded_by);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_subject ON content(subject);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_schedule_slot ON content_schedule(slot_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_slots_teacher ON content_slots(teacher_id);`);

    await client.query('COMMIT');
    console.log(' All tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

createTables().catch(console.error);
