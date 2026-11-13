/**
 * Indian Mobile Number Validation & E.164 Normalization (+91XXXXXXXXXX)
 * and Username Validation utilities.
 */

export interface PhoneValidationResult {
  valid: boolean;
  e164: string | null;
  errorEn?: string;
  errorKn?: string;
}

/**
 * Validates and normalizes an Indian mobile number into strict E.164 format (+91XXXXXXXXXX).
 * Accepts formats such as:
 * - 9876543210
 * - 09876543210
 * - +919876543210
 * - +91 98765 43210
 * - 91-9876543210
 * Enforces 10-digit Indian mobile numbers starting with 6, 7, 8, or 9.
 */
export function normalizeIndianPhone(rawInput: string): PhoneValidationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      valid: false,
      e164: null,
      errorEn: 'Mobile number is required.',
      errorKn: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಅಗತ್ಯವಿದೆ.'
    };
  }

  // Strip spaces, dashes, parentheses
  const cleaned = rawInput.trim().replace(/[\s\-()]/g, '');

  // Reject anything containing non-digits except a single leading '+'
  if (!/^\+?\d+$/.test(cleaned)) {
    return {
      valid: false,
      e164: null,
      errorEn: 'Mobile number may contain only digits and optional +91 prefix.',
      errorKn: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯಲ್ಲಿ ಅಂಕೆಗಳು ಮತ್ತು ಐಚ್ಛಿಕ +91 ಮಾತ್ರ ಇರಬೇಕು.'
    };
  }

  let tenDigits = '';

  if (cleaned.startsWith('+91')) {
    tenDigits = cleaned.slice(3);
  } else if (cleaned.startsWith('+')) {
    return {
      valid: false,
      e164: null,
      errorEn: 'Only Indian mobile numbers (+91) are supported.',
      errorKn: 'ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಗಳಿಗೆ (+91) ಮಾತ್ರ ಬೆಂಬಲವಿದೆ.'
    };
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    tenDigits = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    tenDigits = cleaned.slice(1);
  } else if (cleaned.length === 10) {
    tenDigits = cleaned;
  } else {
    return {
      valid: false,
      e164: null,
      errorEn: 'Enter a valid 10-digit Indian mobile number (e.g. 9845012345).',
      errorKn: 'ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ 10 ಅಂಕಿಯ ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.'
    };
  }

  if (!/^[6-9]\d{9}$/.test(tenDigits)) {
    return {
      valid: false,
      e164: null,
      errorEn: 'Indian mobile numbers must be 10 digits starting with 6, 7, 8, or 9.',
      errorKn: 'ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ 6, 7, 8 ಅಥವಾ 9 ರಿಂದ ಪ್ರಾರಂಭವಾಗಿ 10 ಅಂಕಿಗಳನ್ನು ಹೊಂದಿರಬೇಕು.'
    };
  }

  return {
    valid: true,
    e164: `+91${tenDigits}`
  };
}

/**
 * Formats an E.164 Indian number nicely for UI display (e.g. +91 98450 12345).
 */
export function formatIndianPhoneDisplay(phone?: string | null): string {
  if (!phone) return '';
  const norm = normalizeIndianPhone(phone);
  if (!norm.valid || !norm.e164) return phone;
  const digits = norm.e164.slice(3);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Validates username rules: 3–30 characters, lowercase/uppercase letters, digits, underscore, dot, hyphen.
 */
export function validateUsername(username: string): {
  valid: boolean;
  normalized: string;
  errorEn?: string;
  errorKn?: string;
} {
  const trimmed = (username || '').trim().toLowerCase();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      errorEn: 'Username is required.',
      errorKn: 'ಬಳಕೆದಾರರ ಹೆಸರು ಅಗತ್ಯವಿದೆ.'
    };
  }
  if (!/^[a-z0-9_.-]{3,30}$/.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      errorEn: 'Username must be 3–30 characters using letters, numbers, "_", ".", or "-".',
      errorKn: 'ಬಳಕೆದಾರರ ಹೆಸರು 3–30 ಅಕ್ಷರಗಳು, ಸಂಖ್ಯೆಗಳು ಅಥವಾ _ . - ಒಳಗೊಂಡಿರಬೇಕು.'
    };
  }
  return { valid: true, normalized: trimmed };
}

/**
 * Checks whether a login identifier looks like a phone number or username.
 */
export function parseLoginIdentifier(identifier: string): {
  type: 'phone' | 'username';
  normalizedValue: string;
} {
  const trimmed = (identifier || '').trim();
  const digitsOnly = trimmed.replace(/[\s\-()]/g, '');
  if (/^(\+?91|0)?[6-9]\d{9}$/.test(digitsOnly)) {
    const phoneCheck = normalizeIndianPhone(trimmed);
    if (phoneCheck.valid && phoneCheck.e164) {
      return { type: 'phone', normalizedValue: phoneCheck.e164 };
    }
  }
  return { type: 'username', normalizedValue: trimmed.toLowerCase() };
}
