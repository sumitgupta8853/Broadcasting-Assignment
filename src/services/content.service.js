const path = require('path');
const { query } = require('../config/database');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Upload new content (Teacher)
 */
const uploadContent = async ({ title, description, subject, file, teacherId, start_time, end_time, rotation_duration }) => {
  const file_url = `${BASE_URL}/uploads/${file.filename}`;
  const file_path = file.path;
  const file_type = path.extname(file.originalname).replace('.', '').toLowerCase();
  const file_size = file.size;

  const result = await query(
    `INSERT INTO content
       (title, description, subject, file_url, file_path, file_type, file_size,
        uploaded_by, status, start_time, end_time, rotation_duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11)
     RETURNING *`,
    [
      title.trim(),
      description?.trim() || null,
      subject.trim().toLowerCase(),
      file_url,
      file_path,
      file_type,
      file_size,
      teacherId,
      start_time || null,
      end_time || null,
      rotation_duration ? parseInt(rotation_duration) : 5,
    ]
  );

  const content = result.rows[0];

  // Create or find the content_slot for this teacher+subject
  const slotResult = await query(
    `INSERT INTO content_slots (teacher_id, subject)
     VALUES ($1, $2)
     ON CONFLICT (teacher_id, subject) DO UPDATE SET subject = EXCLUDED.subject
     RETURNING id`,
    [teacherId, subject.trim().toLowerCase()]
  );
  const slotId = slotResult.rows[0].id;

  
  const orderResult = await query(
    `SELECT COALESCE(MAX(rotation_order), 0) + 1 AS next_order FROM content_schedule WHERE slot_id = $1`,
    [slotId]
  );
  const nextOrder = orderResult.rows[0].next_order;

  await query(
    `INSERT INTO content_schedule (content_id, slot_id, rotation_order, duration)
     VALUES ($1, $2, $3, $4)`,
    [content.id, slotId, nextOrder, content.rotation_duration]
  );

  return content;
};

/**
 * Get all content (Principal: all | Teacher: own)
 */
const getAllContent = async ({ role, userId, status, subject, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (role === 'teacher') {
    conditions.push(`c.uploaded_by = $${paramIdx++}`);
    params.push(userId);
  }
  if (status) {
    conditions.push(`c.status = $${paramIdx++}`);
    params.push(status);
  }
  if (subject) {
    conditions.push(`c.subject = $${paramIdx++}`);
    params.push(subject.toLowerCase());
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*) FROM content c ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT c.*, u.name AS teacher_name, u.email AS teacher_email,
            p.name AS approved_by_name
     FROM content c
     JOIN users u ON c.uploaded_by = u.id
     LEFT JOIN users p ON c.approved_by = p.id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return { data: dataResult.rows, total, page, limit };
};

/**
 * Get single content by ID
 */
const getContentById = async (contentId, userId, role) => {
  const result = await query(
    `SELECT c.*, u.name AS teacher_name FROM content c
     JOIN users u ON c.uploaded_by = u.id
     WHERE c.id = $1`,
    [contentId]
  );

  if (result.rows.length === 0) return null;

  const content = result.rows[0];
  // Teachers can only see their own content
  if (role === 'teacher' && content.uploaded_by !== userId) return null;

  return content;
};

/**
 * Approve or reject content (Principal)
 */
const reviewContent = async ({ contentId, action, rejection_reason, principalId }) => {
  // Fetch content
  const existing = await query('SELECT * FROM content WHERE id = $1', [contentId]);
  if (existing.rows.length === 0) {
    throw { statusCode: 404, message: 'Content not found.' };
  }

  const content = existing.rows[0];
  if (content.status !== 'pending') {
    throw { statusCode: 409, message: `Content is already ${content.status}. Only pending content can be reviewed.` };
  }

  let result;
  if (action === 'approve') {
    result = await query(
      `UPDATE content
       SET status = 'approved', approved_by = $1, approved_at = NOW(), rejection_reason = NULL
       WHERE id = $2
       RETURNING *`,
      [principalId, contentId]
    );
  } else {
    result = await query(
      `UPDATE content
       SET status = 'rejected', rejection_reason = $1, approved_by = NULL, approved_at = NULL
       WHERE id = $2
       RETURNING *`,
      [rejection_reason.trim(), contentId]
    );
  }

  return result.rows[0];
};

module.exports = { uploadContent, getAllContent, getContentById, reviewContent };
