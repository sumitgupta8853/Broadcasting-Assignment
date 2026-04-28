const { query } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /users/teachers  (Principal only)
 */
const getAllTeachers = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, created_at FROM users WHERE role = 'teacher' ORDER BY created_at DESC`
    );
    return successResponse(res, result.rows, 'Teachers fetched.');
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * GET /users/teachers/:id/content  (Principal only)
 */
const getTeacherContent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.*, u.name AS teacher_name
       FROM content c
       JOIN users u ON c.uploaded_by = u.id
       WHERE c.uploaded_by = $1
       ORDER BY c.created_at DESC`,
      [id]
    );
    return successResponse(res, result.rows, 'Teacher content fetched.');
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

module.exports = { getAllTeachers, getTeacherContent };
