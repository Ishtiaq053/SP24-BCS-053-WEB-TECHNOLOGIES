// ─── middleware/upload.js ─────────────────────────────────────────────────────
// Multer diskStorage configuration for worker image uploads.
// Saves files to public/uploads/ with a timestamped unique filename.
// Accepts: jpg, jpeg, png, webp — max 5 MB.

const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Storage engine ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext      = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext)
                             .replace(/[^a-z0-9_-]/gi, '_')
                             .toLowerCase()
                             .slice(0, 40);
        const unique   = `${Date.now()}-${baseName}${ext}`;
        cb(null, unique);
    }
});

// ── File filter ───────────────────────────────────────────────────────────────
const ALLOWED_TYPES = /jpeg|jpg|png|webp/;

function fileFilter(req, file, cb) {
    const mimeOk = ALLOWED_TYPES.test(file.mimetype);
    const extOk  = ALLOWED_TYPES.test(path.extname(file.originalname).toLowerCase().replace('.', ''));
    if (mimeOk && extOk) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, JPEG, PNG, and WebP images are allowed.'), false);
    }
}

// ── Export configured multer instance ────────────────────────────────────────
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }  // 5 MB
});

module.exports = upload;
