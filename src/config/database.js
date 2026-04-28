

const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'content_broadcasting',
        user: process.env.DB_USER || 'sumit',
        password: process.env.DB_PASSWORD || '',
      }
);

pool.on('error', (err) => {
  console.error('Unexpected idle client error', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV === 'development') {
    console.log('Query:', { sql: text.substring(0, 60), ms: Date.now() - start, rows: res.rowCount });
  }
  return res;
};

module.exports = { pool, query };