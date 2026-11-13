package com.kisanscheme.saathi.sms;

public record SmsDeliveryResult(
    boolean configured,
    boolean delivered,
    String provider,
    String message
) {}
