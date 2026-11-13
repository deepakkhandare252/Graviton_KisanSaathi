package com.kisanscheme.saathi.rules;

public record RuleCondition(
    String id,
    String field,
    RuleOperator operator,
    Object expectedValue,
    boolean isMandatory,
    boolean isExclusion,
    boolean requiresOfficialVerification,
    String titleEn,
    String titleKn,
    String descriptionEn,
    String descriptionKn
) {}
