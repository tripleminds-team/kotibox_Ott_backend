import nodemailer from 'nodemailer';
import { SettingsModel } from '../models/Settings';
import { NotificationTemplateModel } from '../models/NotificationTemplate';

// Replace [[ variable_name ]] placeholders in a template string
const replaceVariables = (template: string, variables: Record<string, string>): string => {
  return template.replace(/\[\[\s*([^\]]+?)\s*\]\]/g, (_match, key) => {
    // Normalize the same way the dashboard does: lowercase + replace whitespace/apostrophe/slash with _
    const normalized = key.trim().toLowerCase().replace(/[\s'/]+/g, '_');
    return variables[normalized] ?? variables[key.trim()] ?? _match;
  });
};

const getPlatformName = async (): Promise<string> => {
  try {
    const settings = await SettingsModel.findOne().lean();
    return (settings as any)?.platformName || process.env.PLATFORM_NAME || 'StreamVault';
  } catch {
    return process.env.PLATFORM_NAME || 'StreamVault';
  }
};

// Wrap body content in a branded email shell. If content is already a full HTML doc, return as-is.
const wrapEmail = (bodyContent: string, platformName: string): string => {
  if (/^<!DOCTYPE|^<html/i.test(bodyContent.trim())) return bodyContent;
  const inner = /<[a-z][\s\S]*>/i.test(bodyContent)
    ? bodyContent
    : bodyContent.replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f4;padding:30px 10px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
        <tr>
          <td style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:28px 40px;border-radius:10px 10px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">${platformName}</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:32px 40px;border:1px solid #e5e7eb;border-top:none;color:#374151;font-size:15px;line-height:1.7;">
            ${inner}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
            <p style="color:#d1d5db;font-size:11px;margin:5px 0 0;">This is an automated message — please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// Get mail config — prefers DB settings, falls back to env vars
const getMailConfig = async () => {
  try {
    const settings = await SettingsModel.findOne().lean();
    if (settings && (settings as any).mailUsername && (settings as any).mailPassword) {
      return {
        host: (settings as any).mailHost || process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt((settings as any).mailPort || process.env.EMAIL_PORT || '587', 10),
        secure: (settings as any).mailEncryption === 'ssl',
        auth: {
          user: (settings as any).mailUsername,
          pass: (settings as any).mailPassword,
        },
        from: (settings as any).mailFrom || (settings as any).mailUsername,
        fromName: (settings as any).mailFromName || (settings as any).platformName || 'Admin Panel',
      };
    }
  } catch {
    // Fall through to env vars
  }

  return {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    fromName: process.env.EMAIL_FROM_NAME || 'Admin Panel',
  };
};

const createTransporter = async () => {
  const config = await getMailConfig();
  if (!config.auth.user || !config.auth.pass) {
    console.warn('Email credentials not configured. Set mailUsername/mailPassword in Settings or EMAIL_USER/EMAIL_PASS in .env');
    return null;
  }
  return {
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    }),
    from: `"${config.fromName}" <${config.from || config.auth.user}>`,
  };
};

/**
 * Core dynamic email sender.
 * Looks up NotificationTemplate by `type`, replaces [[ variable ]] placeholders,
 * wraps in branded HTML shell, and sends via nodemailer.
 * Logs and returns false (without throwing) if template missing/disabled or mail not configured.
 */
export const sendTemplateEmail = async (
  type: string,
  to: string,
  variables: Record<string, string>
): Promise<boolean> => {
  const result = await createTransporter();
  if (!result) {
    console.log(`[email] Skipped (no credentials). type=${type} to=${to}`);
    return false;
  }
  const { transporter, from } = result;

  try {
    const platformName = await getPlatformName();
    const template = await NotificationTemplateModel.findOne({ type }).lean();

    let subject: string;
    let html: string;

    if (template && (template as any).status && (template as any).emailTemplate) {
      subject = replaceVariables((template as any).emailSubject || type, variables);
      const bodyContent = replaceVariables((template as any).emailTemplate, variables);
      html = wrapEmail(bodyContent, platformName);
    } else {
      // Minimal fallback — still sends something meaningful
      subject = type;
      const rows = Object.entries(variables)
        .filter(([, v]) => v)
        .map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;text-transform:capitalize;">${k.replace(/_/g, ' ')}</td><td style="padding:6px 0;color:#111827;font-weight:600;">${v}</td></tr>`)
        .join('');
      html = wrapEmail(`<p>You have a new notification from <strong>${platformName}</strong>.</p><table style="border-collapse:collapse;width:100%;margin-top:16px;">${rows}</table>`, platformName);
    }

    await transporter.sendMail({ from, to, subject, html });
    console.log(`[email] Sent type=${type} to=${to}`);
    return true;
  } catch (error) {
    console.error(`[email] Failed type=${type} to=${to}:`, error);
    return false;
  }
};

// ---- Named convenience wrappers (backward-compatible) ----

export const sendWelcomeEmail = async (email: string, name: string, username: string, password: string) =>
  sendTemplateEmail('Admin Credentials', email, {
    user_name: name,
    user_id: username,
    user_password: password,
    site_url: process.env.ADMIN_PANEL_URL || 'http://localhost:5173',
  });

export const sendApprovalEmail = async (email: string, name: string, itemType: string, itemName: string) =>
  sendTemplateEmail('Content Approved', email, {
    user_name: name,
    content_type: itemType,
    movie_name: itemName,
    site_url: process.env.ADMIN_PANEL_URL || 'http://localhost:5173',
  });

export const sendRejectionEmail = async (email: string, name: string, itemType: string, itemName: string, reason: string) =>
  sendTemplateEmail('Content Rejected', email, {
    user_name: name,
    content_type: itemType,
    movie_name: itemName,
    description_note: reason,
    site_url: process.env.ADMIN_PANEL_URL || 'http://localhost:5173',
  });

export const sendPasswordResetEmail = async (email: string, name: string, resetToken: string) => {
  const resetUrl = `${process.env.ADMIN_PANEL_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  return sendTemplateEmail('Admin Password Reset', email, {
    user_name: name,
    otp_code: resetToken,
    site_url: resetUrl,
  });
};
