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
        host: process.env.SMTP_HOST || 'smtp.mail.yahoo.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER, // Your email (e.g., no-reply@yourdomain.com)
            pass: process.env.SMTP_PASSWORD // Your email password or app password
        },
        // Yahoo-specific settings
        tls: {
            // Do not fail on invalid certificates
            rejectUnauthorized: false
        },
        // Connection timeout
        connectionTimeout: 10000,
        // Greeting timeout
        greetingTimeout: 10000,
        // Socket timeout
        socketTimeout: 10000
    };

    // For Yahoo Mail:
    // 1. You MUST use an App Password, not your regular password
    // 2. The FROM_EMAIL must match the SMTP_USER (authenticated email)
    // 3. Enable "Less secure app access" or use App Password from Yahoo Account Security

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
        const transporter = createTransporter();

        const supportEmail = process.env.SUPPORT_EMAIL || 'support@yourdomain.com';
        // For Yahoo, FROM_EMAIL must match SMTP_USER (the authenticated email)
        // If FROM_EMAIL is not set, use SMTP_USER as fallback
        const smtpUser = process.env.SMTP_USER;
        const fromEmail = process.env.FROM_EMAIL || smtpUser || 'no-reply@yourdomain.com';

        // Ensure FROM_EMAIL matches SMTP_USER for Yahoo compatibility
        // Yahoo requires the sender to be the authenticated user
        const senderEmail = smtpUser && !process.env.FROM_EMAIL ? smtpUser : fromEmail;

        console.log(process.env.FROM_NAME);
        console.log('Sender Email:', senderEmail);
        console.log('SMTP User:', smtpUser);
        console.log('Support Email:', supportEmail);
        console.log(name);
        console.log(email);
        console.log(message);
        console.log(attachments);
        // Email content
        const mailOptions = {
            from: `"${process.env.FROM_NAME || 'Contact Form'}" <${senderEmail}>`,
            to: supportEmail,
            replyTo: email, // This allows support to reply directly to the user
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
                                        ${attachments.map(att => `<li>${att.filename || 'image'}</li>`).join('')}
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
            attachments: attachments.map((file, index) => ({
                filename: file.originalname || `image-${index + 1}.${file.mimetype.split('/')[1]}`,
                content: file.buffer,
                contentType: file.mimetype
            }))
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        
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

