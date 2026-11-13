import nodemailer from 'nodemailer';

export interface EmailSendResult {
  sent: boolean;
  mode: 'smtp' | 'simulation';
  error?: string;
}

export async function sendVerificationEmail(params: {
  toEmail: string;
  fullName: string;
  verificationUrl: string;
  preferredLanguage?: 'en' | 'kn';
}): Promise<EmailSendResult> {
  const smtpHost = process.env.SMTP_HOST || (process.env.SMTP_USER?.endsWith('@gmail.com') ? 'smtp.gmail.com' : '');
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'no-reply@kisanschemesaathi.local';

  const isConfigured =
    Boolean(smtpHost) &&
    Boolean(smtpUser) &&
    Boolean(smtpPass) &&
    smtpUser !== 'MY_SMTP_USER' &&
    smtpPass !== 'MY_SMTP_APP_PASSWORD';

  if (!isConfigured) {
    console.log(`[AUTH] SMTP not configured. Simulation Verification Link for ${params.toEmail}: ${params.verificationUrl}`);
    return {
      sent: false,
      mode: 'simulation',
      error: 'SMTP credentials (SMTP_USER / SMTP_PASS) are not configured in .env.'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const isKn = params.preferredLanguage === 'kn';
    const subject = isKn
      ? 'ಕಿಸಾನ್ ಸ್ಕೀಮ್ ಸಾಥಿ — ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸವನ್ನು ದೃಢೀಕರಿಸಿ'
      : 'Kisan Scheme Saathi — Verify Your Email Address';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #173F2B; color: #ffffff; padding: 20px 24px;">
          <h2 style="margin: 0; font-size: 20px;">Kisan Scheme Saathi | ಕಿಸಾನ್ ಸ್ಕೀಮ್ ಸಾಥಿ</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #B9E769;">From Scheme Confusion to Application Readiness</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Namaskara <strong>${params.fullName}</strong>,</p>
          <p>${
            isKn
              ? 'ಕಿಸಾನ್ ಸ್ಕೀಮ್ ಸಾಥಿಯಲ್ಲಿ ನೋಂದಾಯಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಖಾತೆಯನ್ನು ದೃಢೀಕರಿಸಲು ಕೆಳಗಿನ ಬಟನ್ ಒತ್ತಿರಿ:'
              : 'Thank you for registering on Kisan Scheme Saathi. Please click the button below to verify your email address:'
          }</p>
          <p style="margin: 24px 0;">
            <a href="${params.verificationUrl}" style="background-color: #238B57; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              ${isKn ? 'ಇಮೇಲ್ ದೃಢೀಕರಿಸಿ / Verify Email' : 'Verify Email Address'}
            </a>
          </p>
          <p style="font-size: 12px; color: #64748b;">
            Or copy and open this link in your browser:<br />
            <a href="${params.verificationUrl}" style="color: #238B57; word-break: break-all;">${params.verificationUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #64748b; margin: 0;">
            This verification link expires in 24 hours. Final scheme eligibility and approvals are determined exclusively by authorized Karnataka government authorities.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Kisan Scheme Saathi" <${smtpFrom}>`,
      to: params.toEmail,
      subject,
      html
    });

    console.log(`[AUTH] Verification email sent via SMTP to ${params.toEmail}`);
    return { sent: true, mode: 'smtp' };
  } catch (err: any) {
    console.error('[AUTH] SMTP email delivery failed:', err?.message || err);
    return {
      sent: false,
      mode: 'simulation',
      error: err?.message || 'SMTP delivery failed'
    };
  }
}
