const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET /users/teachers  (Principal only)
router.get('/teachers', authenticate, authorize('principal'), userController.getAllTeachers);

// GET /users/teachers/:id/content  (Principal only)
router.get('/teachers/:id/content', authenticate, authorize('principal'), userController.getTeacherContent);

module.exports = router;
