package com.kisanscheme.saathi.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class Fast2SmsProvider implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(Fast2SmsProvider.class);

    @Value("${kisan.sms.fast2sms.api-key:}")
    private String apiKey;

    private final RestClient restClient = RestClient.create();

    @Override
    public String getProviderKey() {
        return "fast2sms";
    }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public SmsDeliveryResult sendOtp(String e164Phone, String otpCode, int expiryMinutes) {
        if (!isConfigured()) {
            return new SmsDeliveryResult(false, false, "fast2sms", "Fast2SMS API key is not configured.");
        }
        try {
            String localTenDigits = e164Phone.startsWith("+91") ? e164Phone.substring(3) : e164Phone;
            Map<String, Object> payload = Map.of(
                "route", "otp",
                "variables_values", otpCode,
                "numbers", localTenDigits
            );
            ResponseEntity<String> response = restClient.post()
                .uri("https://www.fast2sms.com/dev/bulkV2")
                .header("authorization", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toEntity(String.class);
            boolean ok = response.getStatusCode().is2xxSuccessful();
            return new SmsDeliveryResult(true, ok, "fast2sms", ok ? "OTP dispatched via Fast2SMS." : "Fast2SMS gateway returned error.");
        } catch (Exception ex) {
            log.warn("Fast2SMS OTP dispatch failed: {}", ex.getMessage());
            return new SmsDeliveryResult(true, false, "fast2sms", "Failed to reach Fast2SMS gateway.");
        }
    }

    @Override
    public SmsDeliveryResult sendNotificationSms(String e164Phone, String text) {
        if (!isConfigured()) {
            return new SmsDeliveryResult(false, false, "fast2sms", "Fast2SMS API key is not configured.");
        }
        try {
            String localTenDigits = e164Phone.startsWith("+91") ? e164Phone.substring(3) : e164Phone;
            Map<String, Object> payload = Map.of(
                "route", "q",
                "message", text,
                "numbers", localTenDigits
            );
            ResponseEntity<String> response = restClient.post()
                .uri("https://www.fast2sms.com/dev/bulkV2")
                .header("authorization", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toEntity(String.class);
            boolean ok = response.getStatusCode().is2xxSuccessful();
            return new SmsDeliveryResult(true, ok, "fast2sms", ok ? "SMS reminder dispatched via Fast2SMS." : "Fast2SMS gateway error.");
        } catch (Exception ex) {
            log.warn("Fast2SMS reminder dispatch failed: {}", ex.getMessage());
            return new SmsDeliveryResult(true, false, "fast2sms", "Failed to reach Fast2SMS gateway.");
        }
    }
}
