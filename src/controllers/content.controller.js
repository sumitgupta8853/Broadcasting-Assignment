const contentService = require('../services/content.service');
const schedulingService = require('../services/scheduling.service');
const { query } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

/**
 * POST /content/upload  (Teacher only)
 */
const uploadContent = async (req, res) => {
  try {
    const content = await contentService.uploadContent({
      ...req.body,
      file: req.file,
      teacherId: req.user.id,
    });
    return successResponse(res, content, 'Content uploaded and pending approval.', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
};

/**
 * GET /content  (Principal: all | Teacher: own)
 */
const getAllContent = async (req, res) => {
  try {
    const { status, subject, page = 1, limit = 20 } = req.query;
    const { data, total } = await contentService.getAllContent({
      role: req.user.role,
      userId: req.user.id,
      status,
      subject,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    return paginatedResponse(res, data, total, page, limit, 'Content fetched.');
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
};

/**
 * GET /content/:id
 */
const getContentById = async (req, res) => {
  try {
    const content = await contentService.getContentById(req.params.id, req.user.id, req.user.role);
    if (!content) return errorResponse(res, 'Content not found.', 404);
    return successResponse(res, content, 'Content fetched.');
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
};

/**
 * PATCH /content/:id/review  (Principal only)
 */
const reviewContent = async (req, res) => {
  try {
    const content = await contentService.reviewContent({
      contentId: req.params.id,
      action: req.body.action,
      rejection_reason: req.body.rejection_reason,
      principalId: req.user.id,
    });
    const msg = req.body.action === 'approve' ? 'Content approved.' : 'Content rejected.';
    return successResponse(res, content, msg);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
};

/**
 * GET /content/live/:teacherId  (Public)
 * Returns currently active content for a teacher.
 */
const getLiveContent = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { subject } = req.query;

    // Validate teacher exists
    const teacherResult = await query(
      `SELECT id FROM users WHERE id = $1 AND role = 'teacher'`,
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      // Per spec: invalid teacher → return empty, not error
      return successResponse(res, null, 'No content available.');
    }

    const active = await schedulingService.getLiveContent(teacherId, subject || null);

    if (!active || (Array.isArray(active) && active.length === 0)) {
      return successResponse(res, null, 'No content available.');
    }

    return successResponse(res, active, 'Live content fetched.');
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
};

/**
 * GET /content/schedule/me  (Teacher: view own schedule)
 */
const getMySchedule = async (req, res) => {
  try {
    const schedule = await schedulingService.getTeacherSchedule(req.user.id);
    return successResponse(res, schedule, 'Schedule fetched.');
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
};

module.exports = { uploadContent, getAllContent, getContentById, reviewContent, getLiveContent, getMySchedule };
