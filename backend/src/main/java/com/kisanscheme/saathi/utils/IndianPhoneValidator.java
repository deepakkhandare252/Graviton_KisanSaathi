package com.kisanscheme.saathi.utils;

import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Validates and normalizes Indian mobile numbers to strict E.164 format (+91XXXXXXXXXX).
 */
public final class IndianPhoneValidator {

    private static final Pattern INDIAN_E164 = Pattern.compile("^\\+91[6-9]\\d{9}$");
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{3,40}$");

    private IndianPhoneValidator() {}

    public static Optional<String> normalizeToE164(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) {
            return Optional.empty();
        }
        String digits = rawPhone.replaceAll("[^\\d]", "");
        if (digits.length() == 11 && digits.startsWith("0")) {
            digits = digits.substring(1);
        } else if (digits.length() == 12 && digits.startsWith("91")) {
            digits = digits.substring(2);
        }
        if (digits.length() != 10) {
            return Optional.empty();
        }
        String candidate = "+91" + digits;
        return INDIAN_E164.matcher(candidate).matches() ? Optional.of(candidate) : Optional.empty();
    }

    public static boolean isValidUsername(String username) {
        return username != null && USERNAME_PATTERN.matcher(username.trim()).matches();
    }

    public static String maskPhone(String e164Phone) {
        if (e164Phone == null || e164Phone.length() < 6) {
            return "+91 ••••••";
        }
        String lastFour = e164Phone.substring(e164Phone.length() - 4);
        return "+91 ••••••" + lastFour;
    }
}
