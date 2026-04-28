const { errorResponse } = require('../utils/response');


const validateContentUpload = (req, res, next) => {
  const { title, subject } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Title is required.');
  } else if (title.trim().length > 255) {
    errors.push('Title must not exceed 255 characters.');
  }

  if (!subject || subject.trim().length === 0) {
    errors.push('Subject is required.');
  }

  if (!req.file) {
    errors.push('File is required.');
  }

  
  const { start_time, end_time } = req.body;
  if (start_time && isNaN(Date.parse(start_time))) {
    errors.push('start_time must be a valid ISO date string.');
  }
  if (end_time && isNaN(Date.parse(end_time))) {
    errors.push('end_time must be a valid ISO date string.');
  }
  if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
    errors.push('end_time must be after start_time.');
  }

  
  const { rotation_duration } = req.body;
  if (rotation_duration !== undefined) {
    const dur = parseInt(rotation_duration);
    if (isNaN(dur) || dur < 1) {
      errors.push('rotation_duration must be a positive integer (minutes).');
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, 'Validation failed.', 400, errors);
  }

  next();
};


const validateApproval = (req, res, next) => {
  const { action, rejection_reason } = req.body;

  if (!action || !['approve', 'reject'].includes(action)) {
    return errorResponse(res, 'action must be either "approve" or "reject".', 400);
  }

  if (action === 'reject' && (!rejection_reason || rejection_reason.trim().length === 0)) {
    return errorResponse(res, 'rejection_reason is required when rejecting content.', 400);
  }

  next();
};


const validateRegister = (req, res, next) => {
  const { name, email, password, role } = req.body;
  const errors = [];

  if (!name || name.trim().length === 0) errors.push('Name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required.');
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters.');
  if (!role || !['principal', 'teacher'].includes(role)) errors.push('Role must be "principal" or "teacher".');

  if (errors.length > 0) return errorResponse(res, 'Validation failed.', 400, errors);
  next();
};


const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required.');
  if (!password || password.length === 0) errors.push('Password is required.');

  if (errors.length > 0) return errorResponse(res, 'Validation failed.', 400, errors);
  next();
};

module.exports = { validateContentUpload, validateApproval, validateRegister, validateLogin };
