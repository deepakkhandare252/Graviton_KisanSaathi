import {
  ConditionEvaluationResult,
  FarmerProfile,
  RuleCondition,
  SchemeDefinition,
  SchemeEligibilityResult,
  EligibilityStatus
} from '../types/scheme';

/**
 * Deterministic Rules Evaluator for Kisan Scheme Saathi
 * Pure, isolated, unit-testable business logic engine.
 */
export class RulesEngine {
  /**
   * Evaluates a single rule condition against the farmer's profile.
   */
  public static evaluateCondition(
    condition: RuleCondition,
    profile: Partial<FarmerProfile>
  ): ConditionEvaluationResult {
    const actualValue = (profile as any)[condition.field];

    // Check if the value is missing / undefined / null
    const isUnknown = actualValue === undefined || actualValue === null;

    if (isUnknown) {
      return {
        condition,
        evaluated: false,
        satisfied: false,
        actualValue: undefined,
        reasonEn: `Condition "${condition.titleEn}" cannot be verified because the required profile information is missing.`,
        reasonKn: `ಅಗತ್ಯ ವಿವರಗಳು ಲಭ್ಯವಿಲ್ಲದ ಕಾರಣ "${condition.titleKn}" ನಿಯಮವನ್ನು ಪರಿಶೀಲಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.`,
        isUnknown: true
      };
    }

    let satisfied = false;

    switch (condition.operator) {
      case 'EQUALS':
        satisfied = actualValue === condition.expectedValue;
        break;

      case 'NOT_EQUALS':
        satisfied = actualValue !== condition.expectedValue;
        break;

      case 'GREATER_THAN_OR_EQUAL':
        satisfied = Number(actualValue) >= Number(condition.expectedValue);
        break;

      case 'LESS_THAN_OR_EQUAL':
        satisfied = Number(actualValue) <= Number(condition.expectedValue);
        break;

      case 'IN':
        if (Array.isArray(condition.expectedValue)) {
          satisfied = condition.expectedValue.includes(actualValue);
        } else {
          satisfied = false;
        }
        break;

      case 'NOT_IN':
        if (Array.isArray(condition.expectedValue)) {
          satisfied = !condition.expectedValue.includes(actualValue);
        } else {
          satisfied = true;
        }
        break;

      case 'BOOLEAN_TRUE':
        satisfied = Boolean(actualValue) === true;
        break;

      case 'BOOLEAN_FALSE':
        satisfied = Boolean(actualValue) === false;
        break;

      default:
        satisfied = false;
    }

    // Explanation formulation
    let reasonEn = '';
    let reasonKn = '';

    if (condition.isExclusion) {
      if (satisfied) {
        // Exclusion condition triggered! Disqualifying!
        reasonEn = `Exclusion triggered: ${condition.titleEn} (${condition.descriptionEn}).`;
        reasonKn = `ಅನರ್ಹತಾ ಷರತ್ತು ಅನ್ವಯವಾಗಿದೆ: ${condition.titleKn} (${condition.descriptionKn}).`;
      } else {
        reasonEn = `No exclusion: ${condition.titleEn} check passed.`;
        reasonKn = `ಅರ್ಹತೆ ಕಾಯ್ದುಕೊಂಡಿದೆ: ${condition.titleKn} ಬಾಧಿಸುವುದಿಲ್ಲ.`;
      }
    } else {
      if (satisfied) {
        reasonEn = `Verified: ${condition.titleEn} criteria met.`;
        reasonKn = `ದೃಢೀಕರಿಸಲಾಗಿದೆ: ${condition.titleKn} ಷರತ್ತು ಪೂರ್ಣಗೊಂಡಿದೆ.`;
      } else {
        reasonEn = `Failed: ${condition.titleEn} requirement not satisfied (Reported: ${actualValue}, Expected: ${condition.expectedValue}).`;
        reasonKn = `ಅರ್ಹತೆ ಹೊಂದಿಲ್ಲ: ${condition.titleKn} ಷರತ್ತು ಪೂರೈಸಲಾಗಿಲ್ಲ (ನಮೂದಿಸಿದ್ದು: ${actualValue}, ಅಪೇಕ್ಷಿಸಿದ್ದು: ${condition.expectedValue}).`;
      }
    }

    return {
      condition,
      evaluated: true,
      satisfied,
      actualValue,
      reasonEn,
      reasonKn,
      isUnknown: false
    };
  }

  /**
   * Evaluates a scheme definition against a farmer profile and classifies into:
   * 1. ELIGIBLE
   * 2. LIKELY_ELIGIBLE (Verification Required)
   * 3. NOT_ELIGIBLE
   */
  public static evaluateScheme(
    scheme: SchemeDefinition,
    profile: Partial<FarmerProfile>
  ): SchemeEligibilityResult {
    const satisfiedConditions: ConditionEvaluationResult[] = [];
    const failedConditions: ConditionEvaluationResult[] = [];
    const unknownConditions: ConditionEvaluationResult[] = [];

    let hasTriggeredExclusion = false;
    let hasFailedMandatory = false;
    let hasPendingVerification = false;

    for (const condition of scheme.conditions) {
      const result = this.evaluateCondition(condition, profile);

      if (result.isUnknown) {
        unknownConditions.push(result);
        if (condition.isMandatory || condition.requiresOfficialVerification) {
          hasPendingVerification = true;
        }
      } else if (condition.isExclusion) {
        if (result.satisfied) {
          // If the exclusion condition evaluated to true, it means the farmer is disqualified!
          hasTriggeredExclusion = true;
          failedConditions.push(result);
        } else {
          satisfiedConditions.push(result);
        }
      } else {
        // Regular condition
        if (result.satisfied) {
          satisfiedConditions.push(result);
          if (condition.requiresOfficialVerification && !result.actualValue) {
            hasPendingVerification = true;
          }
        } else {
          if (condition.isMandatory) {
            hasFailedMandatory = true;
          }
          failedConditions.push(result);
        }
      }
    }

    // Determine Final Eligibility Status strictly deterministically
    let status: EligibilityStatus;
    let statusLabelEn: string;
    let statusLabelKn: string;
    let summaryEn: string;
    let summaryKn: string;
    let nextActionEn: string;
    let nextActionKn: string;

    if (hasTriggeredExclusion || hasFailedMandatory) {
      status = 'NOT_ELIGIBLE';
      statusLabelEn = 'NOT ELIGIBLE';
      statusLabelKn = 'ಅರ್ಹತೆ ಹೊಂದಿಲ್ಲ (ಅನರ್ಹ)';
      
      const failedCount = failedConditions.length;
      summaryEn = `The farmer profile does not satisfy ${failedCount} mandatory eligibility condition(s) for ${scheme.nameEn}.`;
      summaryKn = `ರೈತರ ವಿವರಗಳು ${scheme.nameKn} ಯೋಜನೆಯ ${failedCount} ಕಡ್ಡಾಯ ನಿಯಮಗಳನ್ನು ಪೂರೈಸುತ್ತಿಲ್ಲ.`;

      const firstFail = failedConditions[0];
      nextActionEn = firstFail
        ? `Review the failed criteria: "${firstFail.condition.titleEn}". If your profile information changes or was incorrectly entered, re-evaluate.`
        : 'Consult your local Raitha Samparka Kendra for alternative schemes tailored to your land category.';
      nextActionKn = firstFail
        ? `ಪೂರೈಸದ ನಿಯಮವನ್ನು ಪರಿಶೀಲಿಸಿ: "${firstFail.condition.titleKn}". ದಾಖಲೆಗಳು ಸರಿಹೊಂದಿದರೆ ಮರು-ಪರಿಶೀಲಿಸಿ.`
        : 'ನಿಮ್ಮ ಭೂಮಿಯ ವರ್ಗಕ್ಕೆ ಸೂಕ್ತವಾದ ಇತರ ಯೋಜನೆಗಳಿಗಾಗಿ ಸ್ಥಳೀಯ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರವನ್ನು ಸಂಪರ್ಕಿಸಿ.';
    } else if (unknownConditions.length > 0 || hasPendingVerification) {
      status = 'LIKELY_ELIGIBLE';
      statusLabelEn = 'LIKELY ELIGIBLE — VERIFICATION REQUIRED';
      statusLabelKn = 'ಅರ್ಹತೆಯ ಸಾಧ್ಯತೆ ಇದೆ — ಅಧಿಕೃತ ಪರಿಶೀಲನೆ ಅಗತ್ಯ';

      summaryEn = `The profile meets all reported basic criteria, but ${unknownConditions.length} condition(s) or official government portal registrations require verification before submitting.`;
      summaryKn = `ಮೂಲ ಷರತ್ತುಗಳು ಸರಿಹೊಂದಿವೆ, ಆದರೆ ${unknownConditions.length} ನಿಯಮಗಳು ಅಥವಾ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್ ನೋಂದಣಿ ಅಧಿಕೃತವಾಗಿ ಪರಿಶೀಲನೆಯಾಗಬೇಕಿದೆ.`;

      nextActionEn = `Verify prerequisite records (e.g. FRUITS ID, RTC/Pahani or Crop Survey) on the official ${scheme.departmentEn} portal (${scheme.officialPortalUrl}).`;
      nextActionKn = `ಅಧಿಕೃತ ${scheme.departmentKn} ಪೋರ್ಟಲ್‌ನಲ್ಲಿ (${scheme.officialPortalUrl}) ನಿಮ್ಮ ಫ್ರೂಟ್ಸ್ ಐಡಿ ಅಥವಾ ಪಹಣಿ ದಾಖಲೆಗಳನ್ನು ದೃಢೀಕರಿಸಿ.`;
    } else {
      status = 'ELIGIBLE';
      statusLabelEn = 'ELIGIBLE';
      statusLabelKn = 'ಅರ್ಹತೆ ಹೊಂದಿದ್ದಾರೆ';

      summaryEn = `The farmer meets all evaluated mandatory eligibility and document prerequisites for ${scheme.nameEn}.`;
      summaryKn = `ರೈತರು ${scheme.nameKn} ಯೋಜನೆಯ ಎಲ್ಲಾ ಕಡ್ಡಾಯ ನಿಯಮಗಳನ್ನು ಮತ್ತು ಪೂರ್ವಭಾವಿ ದಾಖಲೆಗಳನ್ನು ಪೂರೈಸಿದ್ದಾರೆ.`;

      nextActionEn = `Proceed to application readiness checklist and apply directly on the official portal (${scheme.officialPortalUrl}) or at your local Raitha Samparka Kendra.`;
      nextActionKn = `ದಾಖಲೆಗಳ ಪರಿಶೀಲನಾ ಪಟ್ಟಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ (${scheme.officialPortalUrl}) ಅಥವಾ ಗ್ರಾಮ ಒನ್ ಕೇಂದ್ರದಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.`;
    }

    return {
      schemeId: scheme.id,
      schemeName: scheme.nameEn,
      schemeNameKn: scheme.nameKn,
      category: scheme.category,
      status,
      statusLabelEn,
      statusLabelKn,
      satisfiedConditions,
      failedConditions,
      unknownConditions,
      verificationRequired: status === 'LIKELY_ELIGIBLE',
      officialSource: scheme.departmentEn,
      officialPortalUrl: scheme.officialPortalUrl,
      lastVerifiedDate: scheme.lastVerifiedDate,
      summaryExplanationEn: summaryEn,
      summaryExplanationKn: summaryKn,
      nextActionEn,
      nextActionKn,
      benefitsEn: scheme.financialBenefitEn,
      benefitsKn: scheme.financialBenefitKn
    };
  }

  /**
   * Evaluates all schemes in a catalog against a farmer profile.
   */
  public static evaluateAllSchemes(
    schemes: SchemeDefinition[],
    profile: Partial<FarmerProfile>
  ): SchemeEligibilityResult[] {
    return schemes.map((scheme) => this.evaluateScheme(scheme, profile));
  }
}
