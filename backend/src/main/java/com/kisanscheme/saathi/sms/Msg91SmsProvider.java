package com.kisanscheme.saathi.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class Msg91SmsProvider implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(Msg91SmsProvider.class);

    @Value("${kisan.sms.msg91.auth-key:}")
    private String authKey;

    @Value("${kisan.sms.msg91.template-id:}")
    private String templateId;

    @Value("${kisan.sms.msg91.sender-id:KSNSAT}")
    private String senderId;

    private final RestClient restClient = RestClient.create();

    @Override
    public String getProviderKey() {
        return "msg91";
    }

    @Override
    public boolean isConfigured() {
        return authKey != null && !authKey.isBlank() && templateId != null && !templateId.isBlank();
    }

    @Override
    public SmsDeliveryResult sendOtp(String e164Phone, String otpCode, int expiryMinutes) {
        if (!isConfigured()) {
            return new SmsDeliveryResult(false, false, "msg91", "MSG91 credentials are not configured.");
        }
        try {
            String digits = e164Phone.replace("+", "");
            Map<String, Object> payload = Map.of(
                "template_id", templateId,
                "sender", senderId,
                "short_url", "0",
                "mobiles", digits,
                "VAR1", otpCode,
                "VAR2", String.valueOf(expiryMinutes)
            );
            ResponseEntity<String> response = restClient.post()
                .uri("https://control.msg91.com/api/v5/flow/")
                .header("authkey", authKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toEntity(String.class);
            boolean ok = response.getStatusCode().is2xxSuccessful();
            return new SmsDeliveryResult(true, ok, "msg91", ok ? "OTP dispatched via MSG91." : "MSG91 gateway returned error.");
        } catch (Exception ex) {
            log.warn("MSG91 OTP dispatch failed: {}", ex.getMessage());
            return new SmsDeliveryResult(true, false, "msg91", "Failed to reach MSG91 SMS gateway.");
        }
    }

    @Override
    public SmsDeliveryResult sendNotificationSms(String e164Phone, String text) {
        if (!isConfigured()) {
            return new SmsDeliveryResult(false, false, "msg91", "MSG91 credentials are not configured.");
        }
        try {
            String digits = e164Phone.replace("+", "");
            Map<String, Object> payload = Map.of(
                "template_id", templateId,
                "recipients", List.of(Map.of("mobiles", digits, "message", text))
            );
            ResponseEntity<String> response = restClient.post()
                .uri("https://control.msg91.com/api/v5/flow/")
                .header("authkey", authKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toEntity(String.class);
            boolean ok = response.getStatusCode().is2xxSuccessful();
            return new SmsDeliveryResult(true, ok, "msg91", ok ? "SMS reminder dispatched via MSG91." : "MSG91 gateway error.");
        } catch (Exception ex) {
            log.warn("MSG91 reminder SMS dispatch failed: {}", ex.getMessage());
            return new SmsDeliveryResult(true, false, "msg91", "Failed to reach MSG91 SMS gateway.");
        }
    }
}
