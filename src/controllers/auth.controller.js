const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');

const register = async (req, res) => {
  try {
    const { user, token } = await authService.register(req.body);
    console.log(user,"Userr")
    return successResponse(res, { user, token }, 'Registration successful.', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
};

const login = async (req, res) => {
  try {
    const { user, token } = await authService.login(req.body);
    return successResponse(res, { user, token }, 'Login successful.');
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
};

const getProfile = async (req, res) => {
  return successResponse(res, req.user, 'Profile fetched.');
};

module.exports = { register, login, getProfile };
