import { FarmerProfile, SchemeEligibilityResult } from '../types/scheme';
import { RulesEngine } from '../rules/rulesEngine';
import { schemeService } from './schemeService';
import { request } from './api';
import { computeProfileHash } from '../lib/queryClient';

export interface EligibilityEvaluationOutcome {
  results: SchemeEligibilityResult[];
  isEvaluatedOffline: boolean;
  evaluationMode: 'online' | 'offline-cached-rules';
  evaluatedAt: string;
  rulesVersion: string;
  lastVerifiedDate: string;
  profileHash: string;
}

export const eligibilityService = {
  /**
   * Deterministically evaluates the farmer's profile against all schemes.
   * Online: authoritative backend /api/eligibility/evaluate.
   * Offline fallback: evaluates strictly against cached verified Karnataka rules,
   * tagging the evaluation explicitly as offline so the user understands limitations.
   */
  async evaluateProfile(profile: Partial<FarmerProfile>): Promise<EligibilityEvaluationOutcome> {
    const profileHash = computeProfileHash(profile);
    const isBrowserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

    if (!isBrowserOffline) {
      try {
        const response = await request<{
          timestamp?: string;
          results: SchemeEligibilityResult[];
        }>('/eligibility/evaluate', {
          method: 'POST',
          body: JSON.stringify(profile)
        });

        if (response && Array.isArray(response.results)) {
          const latestVerified = response.results.reduce(
            (latest, item) => (item.lastVerifiedDate > latest ? item.lastVerifiedDate : latest),
            '2026-10-15'
          );
          return {
            results: response.results,
            isEvaluatedOffline: false,
            evaluationMode: 'online',
            evaluatedAt: response.timestamp || new Date().toISOString(),
            rulesVersion: '2026.5-KAR',
            lastVerifiedDate: latestVerified,
            profileHash
          };
        }
      } catch {
        // Fallback to deterministic local RulesEngine using cached schemes
      }
    }

    const catalog = await schemeService.getAllSchemes();
    const results = RulesEngine.evaluateAllSchemes(catalog.schemes, profile);
    return {
      results,
      isEvaluatedOffline: true,
      evaluationMode: 'offline-cached-rules',
      evaluatedAt: new Date().toISOString(),
      rulesVersion: catalog.sourceVersion,
      lastVerifiedDate: catalog.lastVerifiedDate,
      profileHash
    };
  },

  /**
   * Grounded AI assistant for plain-language bilingual explanation.
   * Strictly grounded in the deterministic evaluation result.
   * Live AI calls require connectivity; offline returns the deterministic verified summary.
   */
  async explainResult(
    schemeId: string,
    result: SchemeEligibilityResult,
    userQuestion: string,
    language: 'en' | 'kn'
  ): Promise<string> {
    const isBrowserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

    if (!isBrowserOffline) {
      try {
        const response = await request<{ explanation: string }>('/assistant/explain', {
          method: 'POST',
          body: JSON.stringify({ schemeId, result, userQuestion, language })
        });
        return response.explanation;
      } catch {
        // Fall through to deterministic summary
      }
    }

    if (language === 'kn') {
      return (
        `${result.schemeNameKn} ಯೋಜನೆಗೆ ನಿಮ್ಮ ಫಲಿತಾಂಶ: ${result.statusLabelKn}.\n\n` +
        `ಕಾರಣ: ${result.summaryExplanationKn}\n\n` +
        `ಮುಂದಿನ ಕ್ರಮ: ${result.nextActionKn}\n\n` +
        `ಅಧಿಕೃತ ಪೋರ್ಟಲ್: ${result.officialPortalUrl}\n\n` +
        `(ಆಫ್‌ಲೈನ್ ಮಾರ್ಗದರ್ಶನ: ನೈಜ-ಸಮಯದ AI ವಿವರಣೆಗಾಗಿ ಇಂಟರ್ನೆಟ್ ಅಗತ್ಯವಿದೆ. ಅಂತಿಮ ಅರ್ಹತೆಯನ್ನು ಕೃಷಿ ಇಲಾಖೆಯ ಅಧಿಕೃತ ಪರಿಶೀಲನೆಯ ನಂತರವೇ ನಿರ್ಧರಿಸಲಾಗುತ್ತದೆ.)`
      );
    }

    return (
      `Your evaluation status for ${result.schemeName} is: ${result.statusLabelEn}.\n\n` +
      `Explanation: ${result.summaryExplanationEn}\n\n` +
      `Next Step: ${result.nextActionEn}\n\n` +
      `Official Portal: ${result.officialPortalUrl}\n\n` +
      `(Offline Advisory Note: Live AI Q&A requires internet connectivity. Official approval is determined exclusively by the authorized government agency upon verification.)`
    );
  }
};
