import nodemailer from 'nodemailer';

// Email configuration - should be moved to environment variables
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

// Create transporter
const createTransporter = () => {
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    console.warn('Email credentials not configured. Email sending will be skipped.');
    return null;
  }

  return nodemailer.createTransport(EMAIL_CONFIG);
};

// Send welcome email with credentials
export const sendWelcomeEmail = async (email: string, name: string, username: string, password: string) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`Email not sent (credentials not configured): Welcome email for ${email}`);
    return false;
  }

  try {
    const mailOptions = {
      from: `"Kotibox Admin" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: 'Welcome to Kotibox Admin Panel - Your Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to Kotibox</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Admin Panel Access</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p style="color: #333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
            <p style="color: #666; line-height: 1.6;">Your account has been created successfully. You can now access the Kotibox Admin Panel with the following credentials:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px; color: #666; font-size: 14px;">Username / Email:</p>
              <p style="margin: 0 0 20px; color: #333; font-size: 18px; font-weight: bold;">${username}</p>
              
              <p style="margin: 0 0 10px; color: #666; font-size: 14px;">Password:</p>
              <p style="margin: 0; color: #333; font-size: 18px; font-weight: bold;">${password}</p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">Please change your password after your first login for security purposes.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:5173'}/login" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Login to Admin Panel</a>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this account, please ignore this email.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

// Send approval notification email
export const sendApprovalEmail = async (email: string, name: string, itemType: string, itemName: string) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`Email not sent (credentials not configured): Approval notification for ${email}`);
    return false;
  }

  try {
    const mailOptions = {
      from: `"Kotibox Admin" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: `${itemType} Approved - Kotibox Admin Panel`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Content Approved</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p style="color: #333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
            <p style="color: #666; line-height: 1.6;">Great news! Your ${itemType.toLowerCase()} <strong>"${itemName}"</strong> has been approved and is now live on the platform.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:5173'}/dashboard" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Dashboard</a>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Approval email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending approval email:', error);
    return false;
  }
};

// Send rejection notification email
export const sendRejectionEmail = async (email: string, name: string, itemType: string, itemName: string, reason: string) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`Email not sent (credentials not configured): Rejection notification for ${email}`);
    return false;
  }

  try {
    const mailOptions = {
      from: `"Kotibox Admin" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: `${itemType} Rejected - Kotibox Admin Panel`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Content Rejected</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p style="color: #333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
            <p style="color: #666; line-height: 1.6;">Your ${itemType.toLowerCase()} <strong>"${itemName}"</strong> has been rejected.</p>
            
            ${reason ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px; color: #666; font-size: 14px; font-weight: bold;">Reason for rejection:</p>
              <p style="margin: 0; color: #333;">${reason}</p>
            </div>
            ` : ''}
            
            <p style="color: #666; line-height: 1.6;">Please review the feedback and make necessary changes before resubmitting.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:5173'}/dashboard" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Dashboard</a>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Rejection email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending rejection email:', error);
    return false;
  }
};
export const sendPasswordResetEmail = async (email: string, name: string, resetToken: string) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`Email not sent (credentials not configured): Password reset for ${email}`);
    return false;
  }

  try {
    const resetUrl = `${process.env.ADMIN_PANEL_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"Kotibox Admin" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: 'Password Reset Request - Kotibox Admin Panel',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p style="color: #333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
            <p style="color: #666; line-height: 1.6;">You requested a password reset for your Kotibox Admin Panel account. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            
            <p style="color: #666; line-height: 1.6;">This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};
