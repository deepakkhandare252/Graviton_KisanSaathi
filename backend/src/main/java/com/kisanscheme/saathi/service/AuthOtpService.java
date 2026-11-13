package com.kisanscheme.saathi.service;

import com.kisanscheme.saathi.model.AccountStatus;
import com.kisanscheme.saathi.model.OtpPurpose;
import com.kisanscheme.saathi.model.OtpVerification;
import com.kisanscheme.saathi.model.User;
import com.kisanscheme.saathi.repository.OtpVerificationRepository;
import com.kisanscheme.saathi.repository.UserRepository;
import com.kisanscheme.saathi.security.JwtService;
import com.kisanscheme.saathi.sms.SmsDeliveryResult;
import com.kisanscheme.saathi.sms.SmsGatewayService;
import com.kisanscheme.saathi.utils.IndianPhoneValidator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AuthOtpService {

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_RESENDS_PER_WINDOW = 5;

    private final SecureRandom secureRandom = new SecureRandom();
    private final UserRepository userRepository;
    private final OtpVerificationRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final SmsGatewayService smsGatewayService;
    private final JwtService jwtService;
    private final String otpHmacSecret;

    public AuthOtpService(
        UserRepository userRepository,
        OtpVerificationRepository otpRepository,
        PasswordEncoder passwordEncoder,
        SmsGatewayService smsGatewayService,
        JwtService jwtService,
        @Value("${kisan.security.otp-secret}") String otpHmacSecret
    ) {
        this.userRepository = userRepository;
        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
        this.smsGatewayService = smsGatewayService;
        this.jwtService = jwtService;
        this.otpHmacSecret = otpHmacSecret;
    }

    public record OtpDispatchOutcome(
        boolean success,
        int httpStatus,
        String message,
        String maskedPhone,
        String phoneNumber,
        boolean smsConfigured,
        boolean smsDelivered,
        String provider,
        int expiresInSeconds,
        int resendCooldownSeconds
    ) {}

    public record AuthOutcome(
        boolean success,
        int httpStatus,
        String message,
        String token,
        User user
    ) {}

    private String generateSixDigitOtp() {
        int code = secureRandom.nextInt(1_000_000);
        return String.format("%06d", code);
    }

    private String hashOtp(String otpId, String e164Phone, OtpPurpose purpose, String rawOtp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(otpHmacSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String payload = otpId + ":" + e164Phone + ":" + purpose.name() + ":" + rawOtp;
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to hash OTP", ex);
        }
    }

    private void invalidatePriorOtps(String phoneNumber, OtpPurpose purpose) {
        List<OtpVerification> active = otpRepository.findByPhoneNumberAndPurposeAndInvalidatedFalseAndUsedAtIsNull(phoneNumber, purpose);
        for (OtpVerification rec : active) {
            rec.setInvalidated(true);
        }
        if (!active.isEmpty()) {
            otpRepository.saveAll(active);
        }
    }

    @Transactional
    public OtpDispatchOutcome registerPendingFarmer(
        String username,
        String fullName,
        String rawPhone,
        String password,
        String confirmPassword,
        boolean termsAccepted,
        String district,
        String preferredLanguage
    ) {
        if (!termsAccepted) {
            return new OtpDispatchOutcome(false, 400, "Terms and privacy policy must be accepted.", null, null, false, false, "unconfigured", 0, 0);
        }
        if (!IndianPhoneValidator.isValidUsername(username)) {
            return new OtpDispatchOutcome(false, 400, "Username must be 3-40 alphanumeric characters (._- allowed).", null, null, false, false, "unconfigured", 0, 0);
        }
        Optional<String> phoneOpt = IndianPhoneValidator.normalizeToE164(rawPhone);
        if (phoneOpt.isEmpty()) {
            return new OtpDispatchOutcome(false, 400, "Enter a valid 10-digit Indian mobile number (+91).", null, null, false, false, "unconfigured", 0, 0);
        }
        if (password == null || password.length() < 6) {
            return new OtpDispatchOutcome(false, 400, "Password must be at least 6 characters.", null, null, false, false, "unconfigured", 0, 0);
        }
        if (!password.equals(confirmPassword)) {
            return new OtpDispatchOutcome(false, 400, "Passwords do not match.", null, null, false, false, "unconfigured", 0, 0);
        }

        String normalizedUsername = username.trim().toLowerCase(Locale.ROOT);
        String normalizedPhone = phoneOpt.get();

        Optional<User> existingByUsername = userRepository.findByUsernameIgnoreCase(normalizedUsername);
        if (existingByUsername.isPresent() && existingByUsername.get().isPhoneVerified()) {
            return new OtpDispatchOutcome(false, 409, "Username is already taken.", null, null, false, false, "unconfigured", 0, 0);
        }
        Optional<User> existingByPhone = userRepository.findByPhoneNumber(normalizedPhone);
        if (existingByPhone.isPresent() && existingByPhone.get().isPhoneVerified()) {
            return new OtpDispatchOutcome(false, 409, "This mobile number is already registered and verified.", null, null, false, false, "unconfigured", 0, 0);
        }

        User farmer = existingByPhone.or(() -> existingByUsername).orElseGet(User::new);
        if (farmer.getId() == null) {
            farmer.setId("usr_" + UUID.randomUUID());
            farmer.setCreatedAt(LocalDateTime.now());
        }
        farmer.setUsername(normalizedUsername);
        farmer.setFullName(fullName.trim());
        farmer.setPhoneNumber(normalizedPhone);
        farmer.setPhoneVerified(false);
        farmer.setAccountStatus(AccountStatus.PENDING_VERIFICATION);
        farmer.setPasswordHash(passwordEncoder.encode(password));
        farmer.setDistrict(district != null ? district.trim() : null);
        farmer.setPreferredLanguage("en".equalsIgnoreCase(preferredLanguage) ? "en" : "kn");
        farmer.setTimezone("Asia/Kolkata");
        farmer.setTermsAccepted(true);
        farmer.setTermsAcceptedAt(LocalDateTime.now());
        farmer.setUpdatedAt(LocalDateTime.now());
        userRepository.save(farmer);

        return issueOtpInternal(farmer.getId(), normalizedPhone, OtpPurpose.REGISTRATION_VERIFY, 0);
    }

    @Transactional
    public OtpDispatchOutcome issueOtpForPhone(String rawPhone, OtpPurpose purpose, boolean enforceCooldown) {
        Optional<String> phoneOpt = IndianPhoneValidator.normalizeToE164(rawPhone);
        if (phoneOpt.isEmpty()) {
            return new OtpDispatchOutcome(false, 400, "Enter a valid Indian mobile number (+91).", null, null, false, false, "unconfigured", 0, 0);
        }
        String phone = phoneOpt.get();
        Optional<User> userOpt = userRepository.findByPhoneNumber(phone);
        if (userOpt.isEmpty()) {
            return new OtpDispatchOutcome(false, 404, "No farmer account found for this mobile number.", null, null, false, false, "unconfigured", 0, 0);
        }
        User user = userOpt.get();

        if (enforceCooldown) {
            Optional<OtpVerification> latest = otpRepository.findTopByPhoneNumberAndPurposeAndInvalidatedFalseAndUsedAtIsNullOrderByCreatedAtDesc(phone, purpose);
            if (latest.isPresent()) {
                long elapsedSeconds = Duration.between(latest.get().getLastSentAt(), LocalDateTime.now()).getSeconds();
                if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
                    int remaining = (int) (RESEND_COOLDOWN_SECONDS - elapsedSeconds);
                    return new OtpDispatchOutcome(
                        false, 429,
                        "Please wait " + remaining + " seconds before requesting another OTP.",
                        IndianPhoneValidator.maskPhone(phone), phone,
                        smsGatewayService.isAnyProviderConfigured(), false, "rate_limited",
                        0, remaining
                    );
                }
            }
        }

        long recentWindowCount = otpRepository.countByPhoneNumberAndPurposeAndCreatedAtAfter(
            phone, purpose, LocalDateTime.now().minusMinutes(30)
        );
        if (recentWindowCount >= MAX_RESENDS_PER_WINDOW) {
            return new OtpDispatchOutcome(
                false, 429,
                "Too many OTP requests in 30 minutes. Please try again later.",
                IndianPhoneValidator.maskPhone(phone), phone,
                smsGatewayService.isAnyProviderConfigured(), false, "rate_limited",
                0, RESEND_COOLDOWN_SECONDS
            );
        }

        return issueOtpInternal(user.getId(), phone, purpose, (int) recentWindowCount);
    }

    private OtpDispatchOutcome issueOtpInternal(String userId, String phone, OtpPurpose purpose, int resendCount) {
        invalidatePriorOtps(phone, purpose);

        String otpId = "otp_" + UUID.randomUUID();
        String code = generateSixDigitOtp();
        LocalDateTime now = LocalDateTime.now();

        OtpVerification record = new OtpVerification();
        record.setId(otpId);
        record.setUserId(userId);
        record.setPhoneNumber(phone);
        record.setPurpose(purpose);
        record.setOtpHash(hashOtp(otpId, phone, purpose, code));
        record.setExpiresAt(now.plusMinutes(OTP_EXPIRY_MINUTES));
        record.setAttempts(0);
        record.setMaxAttempts(MAX_ATTEMPTS);
        record.setResendCount(resendCount);
        record.setLastSentAt(now);
        record.setInvalidated(false);
        record.setCreatedAt(now);
        otpRepository.save(record);

        SmsDeliveryResult smsResult = smsGatewayService.sendOtp(phone, code, OTP_EXPIRY_MINUTES);
        String msg = smsResult.delivered()
            ? "A 6-digit verification OTP has been sent to " + IndianPhoneValidator.maskPhone(phone) + "."
            : (smsResult.configured()
                ? "SMS delivery failed via provider. Please retry."
                : "Account queued for verification. SMS gateway credentials are not configured on this server.");

        return new OtpDispatchOutcome(
            true,
            200,
            msg,
            IndianPhoneValidator.maskPhone(phone),
            phone,
            smsResult.configured(),
            smsResult.delivered(),
            smsResult.provider(),
            OTP_EXPIRY_MINUTES * 60,
            RESEND_COOLDOWN_SECONDS
        );
    }

    @Transactional
    public AuthOutcome verifyRegistrationOtp(String rawPhone, String rawOtp) {
        Optional<String> phoneOpt = IndianPhoneValidator.normalizeToE164(rawPhone);
        if (phoneOpt.isEmpty() || rawOtp == null || !rawOtp.trim().matches("^\\d{6}$")) {
            return new AuthOutcome(false, 400, "Provide a valid mobile number and 6-digit OTP.", null, null);
        }
        String phone = phoneOpt.get();
        OtpVerification otpRecord = verifyOtpRecord(phone, OtpPurpose.REGISTRATION_VERIFY, rawOtp.trim());
        if (otpRecord == null) {
            return new AuthOutcome(false, 400, "Invalid, expired, or locked OTP code.", null, null);
        }

        User user = userRepository.findByPhoneNumber(phone).orElse(null);
        if (user == null) {
            return new AuthOutcome(false, 404, "Farmer account not found.", null, null);
        }

        otpRecord.setUsedAt(LocalDateTime.now());
        otpRepository.save(otpRecord);

        user.setPhoneVerified(true);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtService.generateToken(user);
        return new AuthOutcome(true, 200, "Mobile number verified and farmer account activated.", token, user);
    }

    @Transactional
    public AuthOutcome resetPasswordWithOtp(String rawPhone, String rawOtp, String newPassword, String confirmPassword) {
        if (newPassword == null || newPassword.length() < 6 || !newPassword.equals(confirmPassword)) {
            return new AuthOutcome(false, 400, "Passwords must match and be at least 6 characters.", null, null);
        }
        Optional<String> phoneOpt = IndianPhoneValidator.normalizeToE164(rawPhone);
        if (phoneOpt.isEmpty() || rawOtp == null || !rawOtp.trim().matches("^\\d{6}$")) {
            return new AuthOutcome(false, 400, "Provide a valid mobile number and 6-digit OTP.", null, null);
        }
        String phone = phoneOpt.get();
        OtpVerification otpRecord = verifyOtpRecord(phone, OtpPurpose.PASSWORD_RESET, rawOtp.trim());
        if (otpRecord == null) {
            return new AuthOutcome(false, 400, "Invalid, expired, or locked OTP code.", null, null);
        }

        User user = userRepository.findByPhoneNumber(phone).orElse(null);
        if (user == null) {
            return new AuthOutcome(false, 404, "Farmer account not found.", null, null);
        }

        otpRecord.setUsedAt(LocalDateTime.now());
        otpRepository.save(otpRecord);

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPhoneVerified(true);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return new AuthOutcome(true, 200, "Password updated successfully. You may now sign in.", null, user);
    }

    private OtpVerification verifyOtpRecord(String phone, OtpPurpose purpose, String candidateCode) {
        Optional<OtpVerification> opt = otpRepository.findTopByPhoneNumberAndPurposeAndInvalidatedFalseAndUsedAtIsNullOrderByCreatedAtDesc(phone, purpose);
        if (opt.isEmpty()) {
            return null;
        }
        OtpVerification record = opt.get();
        if (record.getExpiresAt().isBefore(LocalDateTime.now())) {
            record.setInvalidated(true);
            otpRepository.save(record);
            return null;
        }
        if (record.getAttempts() >= record.getMaxAttempts()) {
            record.setInvalidated(true);
            otpRepository.save(record);
            return null;
        }

        String candidateHash = hashOtp(record.getId(), phone, purpose, candidateCode);
        boolean matches = MessageDigest.isEqual(
            candidateHash.getBytes(StandardCharsets.UTF_8),
            record.getOtpHash().getBytes(StandardCharsets.UTF_8)
        );
        if (!matches) {
            int nextAttempts = record.getAttempts() + 1;
            record.setAttempts(nextAttempts);
            if (nextAttempts >= record.getMaxAttempts()) {
                record.setInvalidated(true);
            }
            otpRepository.save(record);
            return null;
        }
        return record;
    }

    public AuthOutcome loginWithIdentifier(String identifier, String password) {
        if (identifier == null || identifier.isBlank() || password == null || password.isBlank()) {
            return new AuthOutcome(false, 400, "Username or mobile number and password are required.", null, null);
        }
        String trimmed = identifier.trim();
        Optional<String> phoneOpt = IndianPhoneValidator.normalizeToE164(trimmed);
        Optional<User> userOpt = phoneOpt.isPresent()
            ? userRepository.findByPhoneNumber(phoneOpt.get())
            : userRepository.findByUsernameIgnoreCase(trimmed);

        if (userOpt.isEmpty()) {
            return new AuthOutcome(false, 401, "Invalid username, mobile number, or password.", null, null);
        }
        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            return new AuthOutcome(false, 401, "Invalid username, mobile number, or password.", null, null);
        }
        if (!user.isPhoneVerified() || user.getAccountStatus() != AccountStatus.ACTIVE) {
            return new AuthOutcome(false, 403, "Verify your mobile number via SMS OTP before signing in.", null, user);
        }
        String token = jwtService.generateToken(user);
        return new AuthOutcome(true, 200, "Signed in successfully.", token, user);
    }
}
