const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
const MAX_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;

const UPLOAD_DIR = path.join(process.cwd(), process.env.UPLOAD_DIR || 'src/uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeValid = ALLOWED_TYPES.includes(file.mimetype);
  const extValid = ALLOWED_EXTENSIONS.includes(ext);

  if (mimeValid && extValid) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only JPG, PNG, and GIF are allowed.`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter,
});

// Express error handler for multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum allowed size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`,
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = { upload, handleUploadError, UPLOAD_DIR };
