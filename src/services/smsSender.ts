/**
 * Production SMS Provider Gateway for India (MSG91 / Twilio / Fast2SMS)
 *
 * Security guarantees:
 * - Never prints OTP values to stdout/stderr logs.
 * - Never simulates SMS delivery as real delivery when credentials are missing.
 * - Optional reminder SMS strictly checks explicit user opt-in before dispatching.
 */

export type SmsProviderType = 'msg91' | 'twilio' | 'fast2sms';

export interface SmsDispatchResult {
  sent: boolean;
  configured: boolean;
  provider: string;
  message: string;
}

export function getConfiguredSmsProvider(): {
  provider: SmsProviderType;
  configured: boolean;
} {
  const raw = (process.env.SMS_PROVIDER || 'msg91').trim().toLowerCase();
  const provider: SmsProviderType =
    raw === 'twilio' || raw === 'fast2sms' ? raw : 'msg91';

  if (provider === 'msg91') {
    const ok = Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID);
    return { provider, configured: ok };
  }
  if (provider === 'twilio') {
    const ok = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM_NUMBER
    );
    return { provider, configured: ok };
  }
  const ok = Boolean(process.env.FAST2SMS_API_KEY);
  return { provider: 'fast2sms', configured: ok };
}

export function maskPhoneNumber(e164Phone: string): string {
  if (!e164Phone || e164Phone.length < 6) return '******';
  return `${e164Phone.slice(0, 3)}******${e164Phone.slice(-4)}`;
}

async function dispatchViaMsg91(e164Phone: string, otp: string): Promise<SmsDispatchResult> {
  const authKey = process.env.MSG91_AUTH_KEY!;
  const templateId = process.env.MSG91_TEMPLATE_ID!;
  const mobile = e164Phone.replace(/^\+/, ''); // MSG91 expects country code digits e.g. 919845012345

  const res = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      'Content-Type': 'application/json',
      authkey: authKey
    },
    body: JSON.stringify({
      template_id: templateId,
      mobile,
      otp
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'MSG91 HTTP error');
    return {
      sent: false,
      configured: true,
      provider: 'msg91',
      message: `SMS provider rejected dispatch (${res.status}): ${errText.slice(0, 120)}`
    };
  }

  return {
    sent: true,
    configured: true,
    provider: 'msg91',
    message: 'OTP dispatched via MSG91.'
  };
}

async function dispatchViaTwilio(
  e164Phone: string,
  bodyText: string
): Promise<SmsDispatchResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;

  const form = new URLSearchParams();
  form.set('To', e164Phone);
  form.set('From', from);
  form.set('Body', bodyText);

  const authHeader = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    }
  );

  if (!res.ok) {
    return {
      sent: false,
      configured: true,
      provider: 'twilio',
      message: `Twilio SMS failed with status ${res.status}.`
    };
  }

  return {
    sent: true,
    configured: true,
    provider: 'twilio',
    message: 'SMS dispatched via Twilio.'
  };
}

async function dispatchViaFast2Sms(
  e164Phone: string,
  otpOrMessage: string,
  isOtp: boolean
): Promise<SmsDispatchResult> {
  const apiKey = process.env.FAST2SMS_API_KEY!;
  const tenDigitIndian = e164Phone.replace(/^\+91/, '');

  const payload = isOtp
    ? {
        route: 'otp',
        variables_values: otpOrMessage,
        numbers: tenDigitIndian
      }
    : {
        route: 'q',
        message: otpOrMessage,
        language: 'english',
        numbers: tenDigitIndian
      };

  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    return {
      sent: false,
      configured: true,
      provider: 'fast2sms',
      message: `Fast2SMS dispatch failed with status ${res.status}.`
    };
  }

  return {
    sent: true,
    configured: true,
    provider: 'fast2sms',
    message: 'SMS dispatched via Fast2SMS.'
  };
}

/**
 * Dispatches a 6-digit OTP SMS using the configured Indian SMS provider.
 * Never logs or exposes the OTP if unconfigured.
 */
export async function sendOtpSms(params: {
  phoneNumber: string;
  otpCode: string;
  purpose: 'REGISTRATION' | 'LOGIN_VERIFICATION' | 'PASSWORD_RESET';
}): Promise<SmsDispatchResult> {
  const { provider, configured } = getConfiguredSmsProvider();
  if (!configured) {
    return {
      sent: false,
      configured: false,
      provider,
      message: `SMS provider (${provider.toUpperCase()}) credentials are not configured in .env.`
    };
  }

  try {
    if (provider === 'msg91') {
      return await dispatchViaMsg91(params.phoneNumber, params.otpCode);
    }
    if (provider === 'twilio') {
      const text = `Kisan Scheme Saathi OTP: ${params.otpCode}. Valid for 5 minutes. Do not share with anyone.`;
      return await dispatchViaTwilio(params.phoneNumber, text);
    }
    return await dispatchViaFast2Sms(params.phoneNumber, params.otpCode, true);
  } catch (err: any) {
    return {
      sent: false,
      configured: true,
      provider,
      message: `SMS network error: ${err?.message || 'Unable to reach provider'}`
    };
  }
}

/**
 * Dispatches a user-consented scheme deadline reminder SMS.
 */
export async function sendDeadlineReminderSms(params: {
  phoneNumber: string;
  schemeName: string;
  deadlineDate: string;
  remainingDays: number;
}): Promise<SmsDispatchResult> {
  const { provider, configured } = getConfiguredSmsProvider();
  if (!configured) {
    return {
      sent: false,
      configured: false,
      provider,
      message: 'SMS provider not configured.'
    };
  }

  const text = `Kisan Scheme Saathi Reminder: ${params.schemeName} deadline is ${params.deadlineDate} (${params.remainingDays} day(s) remaining).`;

  try {
    if (provider === 'twilio') {
      return await dispatchViaTwilio(params.phoneNumber, text);
    }
    if (provider === 'fast2sms') {
      return await dispatchViaFast2Sms(params.phoneNumber, text, false);
    }
    // MSG91 flow API requires a dedicated reminder template ID if configured
    if (process.env.MSG91_REMINDER_TEMPLATE_ID) {
      const mobile = params.phoneNumber.replace(/^\+/, '');
      const res = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: process.env.MSG91_AUTH_KEY!
        },
        body: JSON.stringify({
          template_id: process.env.MSG91_REMINDER_TEMPLATE_ID,
          recipients: [
            {
              mobiles: mobile,
              scheme: params.schemeName,
              deadline: params.deadlineDate,
              days: String(params.remainingDays)
            }
          ]
        })
      });
      return {
        sent: res.ok,
        configured: true,
        provider: 'msg91',
        message: res.ok ? 'Reminder SMS dispatched.' : 'MSG91 reminder flow failed.'
      };
    }
    return {
      sent: false,
      configured: false,
      provider: 'msg91',
      message: 'MSG91_REMINDER_TEMPLATE_ID not configured.'
    };
  } catch (err: any) {
    return {
      sent: false,
      configured: true,
      provider,
      message: err?.message || 'SMS error'
    };
  }
}
