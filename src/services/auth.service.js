const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateToken } = require('../utils/jwt');

const register = async ({ name, email, password, role }) => {
  
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw { statusCode: 409, message: 'Email already registered.' };
  }

  const password_hash = await bcrypt.hash(password, 12);

  const result = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name.trim(), email.toLowerCase().trim(), password_hash, role]
  );

  const user = result.rows[0];
  const token = generateToken({ id: user.id, role: user.role });

  return { user, token };
};

const login = async ({ email, password }) => {
  const result = await query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  if (result.rows.length === 0) {
    throw { statusCode: 401, message: 'Invalid email or password.' };
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw { statusCode: 401, message: 'Invalid email or password.' };
  }

  const token = generateToken({ id: user.id, role: user.role });
  const { password_hash, ...safeUser } = user;

  return { user: safeUser, token };
};

module.exports = { register, login };
