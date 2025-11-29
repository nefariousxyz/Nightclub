/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NIGHTCLUB GAME - SERVER
 * ═══════════════════════════════════════════════════════════════════════════
 * © 2024 Nightclub Game. All Rights Reserved.
 * This software is protected by copyright law.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// SECURITY CONFIGURATION
// ==========================================
const ALLOWED_ORIGINS = [
    'http://localhost',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://127.0.0.1:3000',
    'https://hypeclub.city',
    'https://www.hypeclub.city',
    // Add more allowed origins if needed
];

// Rate limiting storage
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // Max requests per window

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Rate limiting middleware
app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else {
        const record = rateLimitStore.get(ip);
        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + RATE_LIMIT_WINDOW;
        } else {
            record.count++;
            if (record.count > RATE_LIMIT_MAX) {
                return res.status(429).json({ 
                    error: 'Too many requests. Please slow down.',
                    retryAfter: Math.ceil((record.resetTime - now) / 1000)
                });
            }
        }
    }
    next();
});

// Clean up rate limit store periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitStore.entries()) {
        if (now > record.resetTime + RATE_LIMIT_WINDOW) {
            rateLimitStore.delete(ip);
        }
    }
}, 60000);

// Security headers middleware
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Content Security Policy
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://hypeclub.city");
    next();
});

// CORS middleware - RESTRICTED to allowed origins
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Check if origin is in allowed list
    if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
        res.header('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        // Allow requests without origin (same-origin, curl, etc.)
        res.header('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }
    // If origin is not allowed, don't set the header (browser will block)
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
const coversDir = path.join(uploadsDir, 'covers');
const postsDir = path.join(uploadsDir, 'posts');

[uploadsDir, avatarsDir, coversDir, postsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File filter - only allow images
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
};

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with user ID and timestamp
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        const userId = req.body.userId || 'anonymous';
        const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `avatar_${sanitizedUserId}_${uniqueId}${ext}`);
    }
});

// Configure multer for cover uploads
const coverStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, coversDir);
    },
    filename: (req, file, cb) => {
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        const userId = req.body.userId || 'anonymous';
        const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `cover_${sanitizedUserId}_${uniqueId}${ext}`);
    }
});

// Upload middleware with size limits
const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max for avatars
    }
}).single('avatar');

const uploadCover = multer({
    storage: coverStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max for covers
    }
}).single('cover');

// Configure multer for post image uploads
const postStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, postsDir);
    },
    filename: (req, file, cb) => {
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        const userId = req.body.userId || 'anonymous';
        const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `post_${sanitizedUserId}_${Date.now()}_${uniqueId}${ext}`);
    }
});

const uploadPost = multer({
    storage: postStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 8 * 1024 * 1024 // 8MB max for post images
    }
}).single('postImage');

// Avatar upload endpoint
app.post('/api/upload/avatar', (req, res) => {
    uploadAvatar(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'File too large. Maximum size is 5MB.' 
                });
            }
            return res.status(400).json({ success: false, error: err.message });
        } else if (err) {
            console.error('Upload error (avatar):', err);
            const errorMessage = err.message || (typeof err === 'string' ? err : 'Unknown upload error');
            return res.status(400).json({ success: false, error: errorMessage });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        
        // Log successful upload
        console.log(`Avatar uploaded: ${req.file.filename} for user ${req.body.userId || 'anonymous'}`);

        // Delete old avatar if specified
        const oldFile = req.body.oldFile;
        if (oldFile && oldFile.includes('/uploads/avatars/')) {
            // Sanitize path to prevent directory traversal
            const safePath = path.normalize(oldFile).replace(/^(\.\.[\/\\])+/, '');
            const oldPath = path.join(__dirname, safePath);
            
            // Verify the path is still within uploads/avatars
            if (oldPath.startsWith(avatarsDir)) {
                try {
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                } catch (unlinkErr) {
                    console.error('Error deleting old avatar:', unlinkErr);
                    // Continue with upload even if delete fails
                }
            }
        }

        const fileUrl = `/uploads/avatars/${req.file.filename}`;
        res.json({ 
            success: true, 
            url: fileUrl,
            filename: req.file.filename
        });
    });
});

// Cover upload endpoint
app.post('/api/upload/cover', (req, res) => {
    uploadCover(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'File too large. Maximum size is 10MB.' 
                });
            }
            return res.status(400).json({ success: false, error: err.message });
        } else if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Delete old cover if specified
        const oldFile = req.body.oldFile;
        if (oldFile && oldFile.includes('/uploads/covers/')) {
            const oldPath = path.join(__dirname, oldFile);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        const fileUrl = `/uploads/covers/${req.file.filename}`;
        res.json({ 
            success: true, 
            url: fileUrl,
            filename: req.file.filename
        });
    });
});

// Post image upload endpoint
app.post('/api/upload/post', (req, res) => {
    uploadPost(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'File too large. Maximum size is 8MB.' 
                });
            }
            return res.status(400).json({ success: false, error: err.message });
        } else if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/posts/${req.file.filename}`;
        res.json({ 
            success: true, 
            url: fileUrl,
            filename: req.file.filename
        });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🎵 Nightclub server running on http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
});
