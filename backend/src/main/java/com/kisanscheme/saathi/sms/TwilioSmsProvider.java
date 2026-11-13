package com.kisanscheme.saathi.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class TwilioSmsProvider implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(TwilioSmsProvider.class);

    @Value("${kisan.sms.twilio.account-sid:}")
    private String accountSid;

    @Value("${kisan.sms.twilio.auth-token:}")
    private String authToken;

    @Value("${kisan.sms.twilio.from-number:}")
    private String fromNumber;

    private final RestClient restClient = RestClient.create();

    @Override
    public String getProviderKey() {
        return "twilio";
    }

    @Override
    public boolean isConfigured() {
        return accountSid != null && !accountSid.isBlank()
            && authToken != null && !authToken.isBlank()
            && fromNumber != null && !fromNumber.isBlank();
    }

    @Override
    public SmsDeliveryResult sendOtp(String e164Phone, String otpCode, int expiryMinutes) {
        String body = "Kisan Scheme Saathi verification code: " + otpCode
            + ". Valid for " + expiryMinutes + " minutes. Do not share with anyone.";
        return dispatchTwilio(e164Phone, body);
    }

    @Override
    public SmsDeliveryResult sendNotificationSms(String e164Phone, String text) {
        return dispatchTwilio(e164Phone, text);
    }

    private SmsDeliveryResult dispatchTwilio(String to, String body) {
        if (!isConfigured()) {
            return new SmsDeliveryResult(false, false, "twilio", "Twilio credentials are not configured.");
        }
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("To", to);
            form.add("From", fromNumber);
            form.add("Body", body);
            String basicAuth = Base64.getEncoder().encodeToString((accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8));
            ResponseEntity<String> response = restClient.post()
                .uri("https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json")
                .header("Authorization", "Basic " + basicAuth)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .toEntity(String.class);
            boolean ok = response.getStatusCode().is2xxSuccessful();
            return new SmsDeliveryResult(true, ok, "twilio", ok ? "SMS dispatched via Twilio." : "Twilio gateway returned error.");
        } catch (Exception ex) {
            log.warn("Twilio SMS dispatch failed: {}", ex.getMessage());
            return new SmsDeliveryResult(true, false, "twilio", "Failed to reach Twilio SMS gateway.");
        }
    }
}
