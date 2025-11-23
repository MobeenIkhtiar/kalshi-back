import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Create and configure nodemailer transporter
 * Uses SMTP settings from environment variables
 */
const createTransporter = () => {
    // SMTP configuration from environment variables
    const smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER, // Your email (e.g., no-reply@yourdomain.com)
            pass: process.env.SMTP_PASSWORD // Your email password or app password
        }
    };

    // For Gmail, you might need to use an App Password instead of regular password
    // For other providers, adjust the config accordingly

    return nodemailer.createTransport(smtpConfig);
};

/**
 * Send contact form email to support
 * @param {Object} contactData - Contact form data
 * @param {string} contactData.name - User's name
 * @param {string} contactData.email - User's email
 * @param {string} contactData.message - User's message
 * @param {Array} contactData.attachments - Optional array of file attachments
 * @returns {Promise<Object>} Email sending result
 */
export const sendContactEmail = async ({ name, email, message, attachments = [] }) => {
    try {
        console.log('Creating transporter');
        const transporter = createTransporter();
        console.log('Transporter created');

        const supportEmail = process.env.SUPPORT_EMAIL || 'support@yourdomain.com';
        const fromEmail = process.env.FROM_EMAIL || 'no-reply@yourdomain.com';
        console.log('Support email:', supportEmail);
        console.log('From email:', fromEmail);
        console.log('User email:', email);
        console.log('Number of attachments:', attachments.length);
        
        // Process attachments safely
        const processedAttachments = attachments.length > 0 ? attachments.map((file, index) => {
            // Extract file extension from mimetype or use default
            let extension = 'jpg';
            if (file.mimetype && file.mimetype.includes('/')) {
                extension = file.mimetype.split('/')[1];
            } else if (file.originalname) {
                const extMatch = file.originalname.match(/\.([^.]+)$/);
                if (extMatch) extension = extMatch[1];
            }
            
            return {
                filename: file.originalname || `image-${index + 1}.${extension}`,
                content: file.buffer,
                contentType: file.mimetype || 'image/jpeg'
            };
        }) : [];
        
        console.log('Processed attachments:', processedAttachments.length);
        
        // Email content
        // Note: 'from' must be your authenticated email for SMTP, but we format it to show the user's name
        // The 'replyTo' field ensures replies go to the user's email address
        const mailOptions = {
            from: `"${name} (via Contact Form)" <${fromEmail}>`,
            to: supportEmail,
            replyTo: `${name} <${email}>`, // This allows support to reply directly to the user
            subject: `New Contact Form Message from ${name}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                        }
                        .header {
                            background-color: #f4f4f4;
                            padding: 15px;
                            border-radius: 5px 5px 0 0;
                            margin: -20px -20px 20px -20px;
                        }
                        .content {
                            padding: 20px 0;
                        }
                        .field {
                            margin-bottom: 15px;
                        }
                        .label {
                            font-weight: bold;
                            color: #555;
                            margin-bottom: 5px;
                            display: block;
                        }
                        .value {
                            padding: 10px;
                            background-color: #f9f9f9;
                            border-left: 3px solid #007bff;
                            border-radius: 3px;
                        }
                        .message-box {
                            min-height: 100px;
                            white-space: pre-wrap;
                        }
                        .attachments {
                            margin-top: 20px;
                            padding: 15px;
                            background-color: #e7f3ff;
                            border-left: 3px solid #007bff;
                            border-radius: 3px;
                        }
                        .attachments-list {
                            margin-top: 10px;
                            list-style: none;
                            padding: 0;
                        }
                        .attachments-list li {
                            padding: 5px 0;
                            color: #555;
                        }
                        .footer {
                            margin-top: 20px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            font-size: 12px;
                            color: #777;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>New Contact Form Submission</h2>
                        </div>
                        <div class="content">
                            <div class="field">
                                <span class="label">Name:</span>
                                <div class="value">${name}</div>
                            </div>
                            <div class="field">
                                <span class="label">Email:</span>
                                <div class="value">${email}</div>
                            </div>
                            <div class="field">
                                <span class="label">Message:</span>
                                <div class="value message-box">${message}</div>
                            </div>
                            ${attachments.length > 0 ? `
                            <div class="field">
                                <span class="label">Attachments:</span>
                                <div class="attachments">
                                    <p>${attachments.length} image${attachments.length > 1 ? 's' : ''} attached</p>
                                    <ul class="attachments-list">
                                        ${attachments.map((att, idx) => `<li>${att.originalname || `image-${idx + 1}`}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="footer">
                            <p>This email was sent from the contact form on your website.</p>
                            <p>You can reply directly to this email to respond to ${name}.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
New Contact Form Message

Name: ${name}
Email: ${email}

Message:
${message}

---
This email was sent from the contact form on your website.
You can reply directly to this email to respond to ${name}.
            `.trim(),
            attachments: processedAttachments
        };

        // Send email
        console.log('Sending email');
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent');
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        console.error('Error sending contact email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

/**
 * Verify email transporter configuration
 * Useful for testing email setup
 */
export const verifyEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
        return { success: false, message: `Email configuration error: ${error.message}` };
    }
};

