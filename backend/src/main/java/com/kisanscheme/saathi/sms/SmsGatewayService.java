package com.kisanscheme.saathi.sms;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SmsGatewayService {

    @Value("${kisan.sms.provider:}")
    private String configuredProvider;

    private final Map<String, SmsProvider> providers;

    public SmsGatewayService(List<SmsProvider> providerList) {
        this.providers = providerList.stream()
            .collect(Collectors.toMap(p -> p.getProviderKey().toLowerCase(), Function.identity()));
    }

    public SmsProvider resolveActiveProvider() {
        if (configuredProvider != null && !configuredProvider.isBlank()) {
            SmsProvider explicit = providers.get(configuredProvider.trim().toLowerCase());
            if (explicit != null && explicit.isConfigured()) {
                return explicit;
            }
            return null;
        }
        return providers.values().stream()
            .filter(SmsProvider::isConfigured)
            .findFirst()
            .orElse(null);
    }

    public boolean isAnyProviderConfigured() {
        return resolveActiveProvider() != null;
    }

    public SmsDeliveryResult sendOtp(String e164Phone, String otpCode, int expiryMinutes) {
        SmsProvider provider = resolveActiveProvider();
        if (provider == null) {
            return new SmsDeliveryResult(
                false,
                false,
                "unconfigured",
                "Real SMS provider credentials (MSG91, Twilio, or Fast2SMS) are not configured on the backend."
            );
        }
        return provider.sendOtp(e164Phone, otpCode, expiryMinutes);
    }

    public SmsDeliveryResult sendNotificationSms(String e164Phone, String text) {
        SmsProvider provider = resolveActiveProvider();
        if (provider == null) {
            return new SmsDeliveryResult(false, false, "unconfigured", "SMS provider not configured.");
        }
        return provider.sendNotificationSms(e164Phone, text);
    }
}
