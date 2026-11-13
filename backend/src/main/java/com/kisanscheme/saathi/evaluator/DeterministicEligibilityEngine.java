package com.kisanscheme.saathi.evaluator;

import com.kisanscheme.saathi.rules.RuleCondition;
import com.kisanscheme.saathi.rules.RuleOperator;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Deterministic Rules Evaluation Engine
 * Pure authoritative decision maker for farmer scheme eligibility.
 */
@Service
public class DeterministicEligibilityEngine {

    public enum Status {
        ELIGIBLE,
        LIKELY_ELIGIBLE,
        NOT_ELIGIBLE
    }

    public record ConditionResult(
        RuleCondition condition,
        boolean satisfied,
        Object actualValue,
        boolean isUnknown,
        String reasonEn,
        String reasonKn
    ) {}

    public record SchemeEvaluationResult(
        String schemeId,
        String schemeNameEn,
        String schemeNameKn,
        Status status,
        List<ConditionResult> satisfiedConditions,
        List<ConditionResult> failedConditions,
        List<ConditionResult> unknownConditions,
        boolean verificationRequired,
        String summaryEn,
        String summaryKn,
        String nextActionEn,
        String nextActionKn
    ) {}

    public ConditionResult evaluateCondition(RuleCondition condition, Map<String, Object> profile) {
        Object actualValue = profile.get(condition.field());

        if (actualValue == null) {
            return new ConditionResult(
                condition,
                false,
                null,
                true,
                "Information for '" + condition.titleEn() + "' was not provided.",
                "'" + condition.titleKn() + "' ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಲಾಗಿಲ್ಲ."
            );
        }

        boolean satisfied = false;
        RuleOperator op = condition.operator();

        switch (op) {
            case EQUALS -> satisfied = Objects.equals(actualValue.toString(), condition.expectedValue().toString());
            case NOT_EQUALS -> satisfied = !Objects.equals(actualValue.toString(), condition.expectedValue().toString());
            case GREATER_THAN_OR_EQUAL -> {
                double actual = Double.parseDouble(actualValue.toString());
                double expected = Double.parseDouble(condition.expectedValue().toString());
                satisfied = actual >= expected;
            }
            case LESS_THAN_OR_EQUAL -> {
                double actual = Double.parseDouble(actualValue.toString());
                double expected = Double.parseDouble(condition.expectedValue().toString());
                satisfied = actual <= expected;
            }
            case BOOLEAN_TRUE -> satisfied = Boolean.parseBoolean(actualValue.toString());
            case BOOLEAN_FALSE -> satisfied = !Boolean.parseBoolean(actualValue.toString());
            case IN -> {
                if (condition.expectedValue() instanceof Collection<?> col) {
                    satisfied = col.contains(actualValue.toString());
                }
            }
            case NOT_IN -> {
                if (condition.expectedValue() instanceof Collection<?> col) {
                    satisfied = !col.contains(actualValue.toString());
                }
            }
        }

        String reasonEn = satisfied
            ? "Requirement met: " + condition.titleEn()
            : "Requirement failed: " + condition.titleEn() + " (Actual: " + actualValue + ", Required: " + condition.expectedValue() + ")";
        String reasonKn = satisfied
            ? "ಷರತ್ತು ಪೂರ್ಣಗೊಂಡಿದೆ: " + condition.titleKn()
            : "ಷರತ್ತು ಪೂರೈಸಿಲ್ಲ: " + condition.titleKn() + " (ವಾಸ್ತವ: " + actualValue + ")";

        return new ConditionResult(condition, satisfied, actualValue, false, reasonEn, reasonKn);
    }
}
