package com.kisanscheme.saathi.controller;

import com.kisanscheme.saathi.model.OtpPurpose;
import com.kisanscheme.saathi.model.User;
import com.kisanscheme.saathi.repository.UserRepository;
import com.kisanscheme.saathi.service.AuthOtpService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthOtpService authOtpService;
    private final UserRepository userRepository;

    public AuthController(AuthOtpService authOtpService, UserRepository userRepository) {
        this.authOtpService = authOtpService;
        this.userRepository = userRepository;
    }

    public record RegisterRequest(
        String username,
        String fullName,
        String phoneNumber,
        String password,
        String confirmPassword,
        boolean termsAccepted,
        String district,
        String preferredLanguage
    ) {}

    public record SendOtpRequest(String phoneNumber, String purpose) {}
    public record VerifyOtpRequest(String phoneNumber, String otp) {}
    public record LoginRequest(String identifier, String usernameOrPhone, String password) {}
    public record ForgotPasswordRequest(String phoneNumber) {}
    public record ResetPasswordRequest(String phoneNumber, String otp, String newPassword, String confirmPassword) {}
    public record UpdateProfileRequest(String fullName, String district, String preferredLanguage, Boolean smsRemindersEnabled) {}

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest req) {
        var outcome = authOtpService.registerPendingFarmer(
            req.username(),
            req.fullName() != null ? req.fullName() : "",
            req.phoneNumber(),
            req.password(),
            req.confirmPassword(),
            req.termsAccepted(),
            req.district(),
            req.preferredLanguage()
        );
        return ResponseEntity.status(outcome.httpStatus()).body(toOtpMap(outcome));
    }

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody SendOtpRequest req) {
        OtpPurpose purpose = parsePurpose(req.purpose());
        var outcome = authOtpService.issueOtpForPhone(req.phoneNumber(), purpose, false);
        return ResponseEntity.status(outcome.httpStatus()).body(toOtpMap(outcome));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, Object>> resendOtp(@RequestBody SendOtpRequest req) {
        OtpPurpose purpose = parsePurpose(req.purpose());
        var outcome = authOtpService.issueOtpForPhone(req.phoneNumber(), purpose, true);
        return ResponseEntity.status(outcome.httpStatus()).body(toOtpMap(outcome));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest req) {
        var outcome = authOtpService.verifyRegistrationOtp(req.phoneNumber(), req.otp());
        return ResponseEntity.status(outcome.httpStatus()).body(toAuthMap(outcome));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest req) {
        String id = req.identifier() != null ? req.identifier() : req.usernameOrPhone();
        var outcome = authOtpService.loginWithIdentifier(id, req.password());
        return ResponseEntity.status(outcome.httpStatus()).body(toAuthMap(outcome));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        return ResponseEntity.ok(Map.of("success", true, "message", "Signed out."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody ForgotPasswordRequest req) {
        var outcome = authOtpService.issueOtpForPhone(req.phoneNumber(), OtpPurpose.PASSWORD_RESET, true);
        return ResponseEntity.status(outcome.httpStatus()).body(toOtpMap(outcome));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody ResetPasswordRequest req) {
        var outcome = authOtpService.resetPasswordWithOtp(req.phoneNumber(), req.otp(), req.newPassword(), req.confirmPassword());
        return ResponseEntity.status(outcome.httpStatus()).body(toAuthMap(outcome));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        return ResponseEntity.ok(sanitizeUser(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
        @AuthenticationPrincipal User user,
        @RequestBody UpdateProfileRequest req
    ) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        if (req.fullName() != null && !req.fullName().isBlank()) {
            user.setFullName(req.fullName().trim());
        }
        if (req.district() != null) {
            user.setDistrict(req.district().trim());
        }
        if (req.preferredLanguage() != null) {
            user.setPreferredLanguage("en".equalsIgnoreCase(req.preferredLanguage()) ? "en" : "kn");
        }
        if (req.smsRemindersEnabled() != null) {
            user.setSmsRemindersEnabled(req.smsRemindersEnabled());
        }
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return ResponseEntity.ok(sanitizeUser(user));
    }

    private OtpPurpose parsePurpose(String raw) {
        if ("PASSWORD_RESET".equalsIgnoreCase(raw)) return OtpPurpose.PASSWORD_RESET;
        if ("PHONE_CHANGE".equalsIgnoreCase(raw)) return OtpPurpose.PHONE_CHANGE;
        return OtpPurpose.REGISTRATION_VERIFY;
    }

    private Map<String, Object> toOtpMap(AuthOtpService.OtpDispatchOutcome o) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("success", o.success());
        map.put("message", o.message());
        if (!o.success()) {
            map.put("error", o.message());
        }
        map.put("maskedPhone", o.maskedPhone());
        map.put("phoneNumber", o.phoneNumber());
        map.put("smsConfigured", o.smsConfigured());
        map.put("smsDelivered", o.smsDelivered());
        map.put("provider", o.provider());
        map.put("expiresInSeconds", o.expiresInSeconds());
        map.put("resendCooldownSeconds", o.resendCooldownSeconds());
        return map;
    }

    private Map<String, Object> toAuthMap(AuthOtpService.AuthOutcome o) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("success", o.success());
        map.put("message", o.message());
        if (!o.success()) {
            map.put("error", o.message());
        }
        if (o.token() != null) {
            map.put("token", o.token());
        }
        if (o.user() != null) {
            map.put("user", sanitizeUser(o.user()));
        }
        return map;
    }

    public static Map<String, Object> sanitizeUser(User u) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", u.getId());
        map.put("username", u.getUsername());
        map.put("fullName", u.getFullName());
        map.put("phoneNumber", u.getPhoneNumber());
        map.put("phoneVerified", u.isPhoneVerified());
        map.put("district", u.getDistrict());
        map.put("preferredLanguage", u.getPreferredLanguage());
        map.put("timezone", u.getTimezone());
        map.put("smsRemindersEnabled", u.isSmsRemindersEnabled());
        map.put("accountStatus", u.getAccountStatus().name());
        map.put("createdAt", u.getCreatedAt().toString());
        return map;
    }
}
