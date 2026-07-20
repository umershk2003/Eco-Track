import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.'));
        }
    }
});

// Middleware to handle single image upload
export const uploadImageMiddleware = upload.single('image');

export const validateAIRequest = (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided in the request.' });
    }
    // Validation is handled by multer fileFilter and limits, if we get here, it's valid.
    next();
};
