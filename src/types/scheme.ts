/**
 * Core Domain Models for Kisan Scheme Saathi
 * Deterministic, explainable eligibility engine data structures.
 */

export type EligibilityStatus = 
  | 'ELIGIBLE' 
  | 'LIKELY_ELIGIBLE' 
  | 'NOT_ELIGIBLE';

export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL'
  | 'IN'
  | 'NOT_IN'
  | 'BOOLEAN_TRUE'
  | 'BOOLEAN_FALSE';

export interface RuleCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  expectedValue: any;
  isMandatory: boolean;
  isExclusion: boolean; // If true and condition matches, farmer is immediately disqualified
  titleEn: string;
  titleKn: string;
  descriptionEn: string;
  descriptionKn: string;
  requiresOfficialVerification?: boolean;
}

export interface ConditionEvaluationResult {
  condition: RuleCondition;
  evaluated: boolean;
  satisfied: boolean;
  actualValue: any;
  reasonEn: string;
  reasonKn: string;
  isUnknown: boolean;
}

export interface SchemeEligibilityResult {
  schemeId: string;
  schemeName: string;
  schemeNameKn: string;
  category: string;
  status: EligibilityStatus;
  statusLabelEn: string;
  statusLabelKn: string;
  satisfiedConditions: ConditionEvaluationResult[];
  failedConditions: ConditionEvaluationResult[];
  unknownConditions: ConditionEvaluationResult[];
  verificationRequired: boolean;
  officialSource: string;
  officialPortalUrl: string;
  lastVerifiedDate: string;
  summaryExplanationEn: string;
  summaryExplanationKn: string;
  nextActionEn: string;
  nextActionKn: string;
  benefitsEn: string;
  benefitsKn: string;
}

export interface DocumentPrerequisite {
  id: string;
  nameEn: string;
  nameKn: string;
  descriptionEn: string;
  descriptionKn: string;
  issuingAuthority: string;
  portalUrl?: string;
  howToObtainEn: string;
  howToObtainKn: string;
  isMandatory: boolean;
}

export type Scheme = SchemeDefinition;

export interface SchemeDefinition {
  id: string;
  nameEn: string;
  nameKn: string;
  taglineEn: string;
  taglineKn: string;
  departmentEn: string;
  departmentKn: string;
  category: string;
  categoryKn: string;
  financialBenefitEn: string;
  financialBenefitKn: string;
  officialPortalUrl: string;
  informationUrl: string;
  lastVerifiedDate: string;
  rulesVersion: string;
  applicationDeadline?: string | null;
  deadlineType?: 'SEASONAL_CUTOFF' | 'CYCLE_WINDOW' | 'ROLLING_OPEN';
  deadlineVerified?: boolean;
  deadlineNoteEn?: string;
  deadlineNoteKn?: string;
  conditions: RuleCondition[];
  prerequisites: DocumentPrerequisite[];
  applicationStepsEn: string[];
  applicationStepsKn: string[];
  helplinePhone?: string;
  assistanceCentresEn: string[];
  assistanceCentresKn: string[];
}

export interface FarmerProfile {
  state: string; // Defaults to "Karnataka"
  district: string;
  taluk?: string;
  farmerCategory: 'small_marginal' | 'large' | 'tenant' | 'agricultural_laborer' | 'woman_farmer';
  socialCategory: 'GEN' | 'SC' | 'ST' | 'OBC_CAT_1' | 'OBC_2A' | 'OBC_2B' | 'OBC_3A' | 'OBC_3B' | 'MINORITY';
  landHoldingAcres: number;
  hasLandOwnership: boolean;
  annualIncome: number;
  age: number;
  
  // Agricultural activity
  cropsGrown: string[];
  hasWaterSource: boolean; // Borewell, canal, farm pond, open well
  hasExistingBorewell: boolean;
  isCooperativeMember: boolean;
  hasChildrenInHigherEducation: boolean;
  notifiedCropInHobli: boolean;
  
  // Registrations & Identity
  hasFruitsId: boolean; // Karnataka FRUITS ID
  fruitsIdNumber?: string;
  hasRtcOrPahani: boolean; // Bhoomi RTC record
  hasAadhaarBankLinked: boolean; // NPCI DBT link
  hasCasteIncomeCertificate: boolean; // Nadakacheri RD number
  hasSowingCertificate: boolean; // Crop survey app / VA
  
  // Disqualifying conditions (Exclusions)
  isInstitutionalLandholder: boolean;
  isConstitutionalPostHolder: boolean; // MP/MLA/Minister/Mayor
  isGovernmentEmployee: boolean;
  isIncomeTaxPayee: boolean;
  isEnrolledInEsiOrCghs: boolean;
}
