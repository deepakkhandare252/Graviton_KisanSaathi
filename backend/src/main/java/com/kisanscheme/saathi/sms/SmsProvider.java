package com.kisanscheme.saathi.sms;

public interface SmsProvider {
    String getProviderKey();
    boolean isConfigured();
    SmsDeliveryResult sendOtp(String e164Phone, String otpCode, int expiryMinutes);
    SmsDeliveryResult sendNotificationSms(String e164Phone, String text);
}
