import express from 'express';
import multer from 'multer';
import { submitContact, verifyContactEmail } from '../controllers/contact.controller.js';
import { uploadImages } from '../middlewares/upload.middleware.js';
import { badRequestResponse } from '../utils/responses.js';

const router = express.Router();

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return badRequestResponse(res, 'File size too large. Maximum size is 5MB per file.');
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return badRequestResponse(res, 'Too many files. Maximum 5 images allowed.');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return badRequestResponse(res, 'Unexpected file field. Use "images" field for file uploads.');
        }
        return badRequestResponse(res, `File upload error: ${err.message}`);
    }
    if (err) {
        return badRequestResponse(res, err.message || 'File upload error');
    }
    next();
};

// Submit contact form (public endpoint - no auth required)
// Supports multipart/form-data with optional image attachments
router.post('/', uploadImages, handleMulterError, submitContact);

// Verify email configuration (useful for testing)
router.get('/verify', verifyContactEmail);

export default router;

