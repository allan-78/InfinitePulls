const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Temporary upload folder
const tmpDir = path.join(os.tmpdir(), 'rubbersense_uploads');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, base + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Increased to 10MB per file
    files: 5 // Maximum 5 files
  }
});

// Enhanced middleware that handles both JSON and file uploads
exports.uploadWithJson = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  console.log('Content-Type:', contentType);
  console.log('Has file in request:', !!req.file);
  
  if (contentType.includes('multipart/form-data')) {
    // Handle file upload with Multer
    upload.single('avatar')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error'
        });
      }
      next();
    });
  } else {
    // For JSON requests, just parse the body
    // Express.json() should already have parsed it, but we ensure it's handled
    if (contentType.includes('application/json')) {
      // Body already parsed by express.json() middleware
      console.log('JSON body parsed:', req.body);
    }
    next();
  }
};

// Keep original for other routes that only need file upload
exports.upload = upload;