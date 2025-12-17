import { sendContactEmail, verifyEmailConfig } from '../utils/email.js';
import {
    successResponse,
    badRequestResponse,
    serverErrorResponse,
    validationErrorResponse
} from '../utils/responses.js';

/**
 * Send contact form submission
 * POST /api/contact
 * Supports multipart/form-data with optional image attachments
 */
export const submitContact = async (req, res) => {
    try {
        // Handle multer errors
        if (req.fileValidationError) {
            return badRequestResponse(res, req.fileValidationError);
        }

        // Handle both JSON and form-data
        const name = req.body.name;
        const email = req.body.email;
        const message = req.body.message;
        const files = req.files || [];

        // Validation
        const errors = [];

        if (!name || name.trim().length === 0) {
            errors.push('Name is required');
        } else if (name.trim().length < 2) {
            errors.push('Name must be at least 2 characters');
        }

        if (!email || email.trim().length === 0) {
            errors.push('Email is required');
        } else {
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                errors.push('Invalid email format');
            }
        }

        if (!message || message.trim().length === 0) {
            errors.push('Message is required');
        } else if (message.trim().length < 10) {
            errors.push('Message must be at least 10 characters');
        } else if (message.trim().length > 5000) {
            errors.push('Message must be less than 5000 characters');
        }

        if (errors.length > 0) {
            return validationErrorResponse(res, 'Validation failed', errors);
        }

        // Validate file attachments if any
        if (files.length > 0) {
            const maxFileSize = 5 * 1024 * 1024; // 5MB
            const maxFiles = 5;
            
            if (files.length > maxFiles) {
                return badRequestResponse(res, `Maximum ${maxFiles} images allowed`);
            }

            for (const file of files) {
                if (file.size > maxFileSize) {
                    return badRequestResponse(res, `File ${file.originalname} exceeds 5MB limit`);
                }
            }
        }

        // Sanitize inputs
        const sanitizedData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            message: message.trim(),
            attachments: files // Pass files as attachments
        };

        // Send email
        try {
            const emailResult = await sendContactEmail(sanitizedData);
            
            return successResponse(res, 'Contact form submitted successfully. We will get back to you soon!', {
                messageId: emailResult.messageId
            });
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            return serverErrorResponse(res, 'Failed to send email. Please try again later or contact us directly.');
        }

    } catch (error) {
        console.error('Contact form submission error:', error);
        return serverErrorResponse(res, 'An error occurred while processing your request');
    }
};

/**
 * Verify email configuration (for testing/admin purposes)
 * GET /api/contact/verify
 */
export const verifyContactEmail = async (req, res) => {
    try {
        const result = await verifyEmailConfig();
        
        if (result.success) {
            return successResponse(res, result.message);
        } else {
            return serverErrorResponse(res, result.message);
        }
    } catch (error) {
        console.error('Email verification error:', error);
        return serverErrorResponse(res, 'Failed to verify email configuration');
    }
};

