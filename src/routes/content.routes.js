const express = require('express');
const router = express.Router();
const contentController = require('../controllers/content.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { upload, handleUploadError } = require('../middlewares/upload.middleware');
const { validateContentUpload, validateApproval } = require('../middlewares/validation.middleware');

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

// GET /content/live/:teacherId  — Public broadcasting endpoint
// Must be declared BEFORE /:id to avoid route conflict
router.get('/live/:teacherId', contentController.getLiveContent);

// ─────────────────────────────────────────────
// PROTECTED ROUTES (all roles)
// ─────────────────────────────────────────────

// GET /content  — Principal sees all; Teacher sees own
router.get('/', authenticate, contentController.getAllContent);

// GET /content/schedule/me  — Teacher views own schedule
router.get('/schedule/me', authenticate, authorize('teacher'), contentController.getMySchedule);

// GET /content/:id  — Single content (Principal: any; Teacher: own only)
router.get('/:id', authenticate, contentController.getContentById);

// ─────────────────────────────────────────────
// TEACHER ROUTES
// ─────────────────────────────────────────────

// POST /content/upload  — Teacher uploads content
router.post(
  '/upload',
  authenticate,
  authorize('teacher'),
  upload.single('file'),
  handleUploadError,
  validateContentUpload,
  contentController.uploadContent
);

// ─────────────────────────────────────────────
// PRINCIPAL ROUTES
// ─────────────────────────────────────────────

// PATCH /content/:id/review  — Principal approves or rejects
router.patch(
  '/:id/review',
  authenticate,
  authorize('principal'),
  validateApproval,
  contentController.reviewContent
);

module.exports = router;
