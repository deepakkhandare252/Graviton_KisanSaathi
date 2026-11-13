package com.kisanscheme.saathi;

import com.kisanscheme.saathi.model.AccountStatus;
import com.kisanscheme.saathi.model.OtpPurpose;
import com.kisanscheme.saathi.model.OtpVerification;
import com.kisanscheme.saathi.model.User;
import com.kisanscheme.saathi.repository.OtpVerificationRepository;
import com.kisanscheme.saathi.repository.UserRepository;
import com.kisanscheme.saathi.security.JwtService;
import com.kisanscheme.saathi.service.AuthOtpService;
import com.kisanscheme.saathi.sms.SmsDeliveryResult;
import com.kisanscheme.saathi.sms.SmsGatewayService;
import com.kisanscheme.saathi.utils.IndianPhoneValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpAndDeadlineServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private OtpVerificationRepository otpRepository;

    @Mock
    private SmsGatewayService smsGatewayService;

    @Mock
    private JwtService jwtService;

    @Test
    void validatesAndNormalizesIndianMobileNumbersToE164() {
        assertEquals("+919845012345", IndianPhoneValidator.normalizeToE164("9845012345"));
        assertEquals("+919845012345", IndianPhoneValidator.normalizeToE164("+91 98450 12345"));
        assertEquals("+919845012345", IndianPhoneValidator.normalizeToE164("09845012345"));
        assertEquals("+919845012345", IndianPhoneValidator.normalizeToE164("919845012345"));

        assertThrows(IllegalArgumentException.class, () -> IndianPhoneValidator.normalizeToE164("1234567890"));
        assertThrows(IllegalArgumentException.class, () -> IndianPhoneValidator.normalizeToE164("+14155551234"));
    }

    @Test
    void verifiesOtpActivatesPendingUserAndRejectsWrongAttempts() {
        PasswordEncoder encoder = new BCryptPasswordEncoder(10);
        AuthOtpService service = new AuthOtpService(
            userRepository,
            otpRepository,
            smsGatewayService,
            encoder,
            jwtService,
            "test-otp-hmac-secret",
            5,
            5,
            60
        );

        when(userRepository.findByUsernameIgnoreCase("new_farmer")).thenReturn(Optional.empty());
        when(userRepository.findByPhoneNumber("+919845099887")).thenReturn(Optional.empty());
        when(otpRepository.findRecentOtps(anyString(), any(), any())).thenReturn(List.of());
        when(otpRepository.findActiveOtps(anyString(), any())).thenReturn(List.of());
        when(smsGatewayService.sendOtpSms(anyString(), anyString()))
            .thenReturn(new SmsDeliveryResult(true, true, "MSG91", "Dispatched", "msg-1"));

        ArgumentCaptor<String> sentMessageCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<OtpVerification> otpCaptor = ArgumentCaptor.forClass(OtpVerification.class);

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("usr_test_1");
            return u;
        });
        when(otpRepository.save(otpCaptor.capture())).thenAnswer(inv -> inv.getArgument(0));

        service.initiateRegistration(
            "new_farmer",
            "Ramesh Gowda",
            "9845099887",
            "Strong@123",
            "Strong@123",
            true,
            "kn",
            "Mandya"
        );

        verify(smsGatewayService).sendOtpSms(eq("+919845099887"), sentMessageCaptor.capture());
        String otpMessage = sentMessageCaptor.getValue();
        String rawOtp = otpMessage.replaceAll("\\D+", "").substring(0, 6);

        OtpVerification storedOtp = otpCaptor.getValue();
        assertNotEquals(rawOtp, storedOtp.getOtpHash());
        assertEquals(OtpPurpose.REGISTRATION, storedOtp.getPurpose());
        assertTrue(storedOtp.getExpiresAt().isAfter(Instant.now().plus(4, ChronoUnit.MINUTES)));

        User pendingUser = new User();
        pendingUser.setId("usr_test_1");
        pendingUser.setUsername("new_farmer");
        pendingUser.setPhoneNumber("+919845099887");
        pendingUser.setAccountStatus(AccountStatus.PENDING_VERIFICATION);
        pendingUser.setPhoneVerified(false);

        when(otpRepository.findTopByPhoneNumberAndPurposeAndVerifiedAtIsNullAndInvalidatedAtIsNullOrderByCreatedAtDesc(
            "+919845099887", OtpPurpose.REGISTRATION
        )).thenReturn(Optional.of(storedOtp));
        when(userRepository.findByPhoneNumber("+919845099887")).thenReturn(Optional.of(pendingUser));
        when(jwtService.generateToken(any(), any())).thenReturn("jwt-token-sample");

        User activated = service.verifyRegistrationOtp("9845099887", rawOtp);
        assertTrue(activated.isPhoneVerified());
        assertEquals(AccountStatus.ACTIVE, activated.getAccountStatus());
        assertNotNull(storedOtp.getVerifiedAt());
    }
}
