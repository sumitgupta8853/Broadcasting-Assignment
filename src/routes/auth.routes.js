const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateRegister, validateLogin } = require('../middlewares/validation.middleware');

// POST /auth/register
router.post('/register', validateRegister, authController.register);

// POST /auth/login
router.post('/login', validateLogin, authController.login);

// GET /auth/me
router.get('/me', authenticate, authController.getProfile);

module.exports = router;
