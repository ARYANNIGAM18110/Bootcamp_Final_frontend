import {
  ExtractedSkillList,
  ParsedResumeOutput,
  CandidateProfile,
  TalentCheckResult,
  SkillMatchingResult,
  UserSession,
} from '../../types/radix';
import { CompanyExpectationProfile } from '../../data/mockDataset';

export interface LoginPayload {
  email: string;
  password?: string;
  candidateId?: string;
  rememberMe?: boolean;
}

export interface SignupPayload {
  name: string;
  email: string;
  password?: string;
  candidateId?: string;
}

export type AuthProviderType = 'github' | 'google' | 'linkedin';

export interface IAuthService {
  getCurrentSession(): UserSession | null;
  login(payload: LoginPayload): Promise<UserSession>;
  signup(payload: SignupPayload): Promise<UserSession>;
  loginWithProvider(provider: AuthProviderType): Promise<UserSession>;
  logout(): Promise<void>;
  switchDemoCandidate(candidateId: string): Promise<UserSession>;
}

export interface AnalyzeJDInput {
  file?: File;
  sampleId?: string;
  rawText?: string;
  companyOverride?: string;
  roleOverride?: string;
}

export interface IJDAnalyticsService {
  getSampleJDs(): Promise<ExtractedSkillList[]>;
  analyzeJD(input: AnalyzeJDInput): Promise<ExtractedSkillList>;
}

export interface ParseResumeInput {
  file?: File;
  sampleCandidateId?: string;
}

export interface IResumeParsingService {
  getSampleResumes(): Promise<ParsedResumeOutput[]>;
  parseResume(input: ParseResumeInput): Promise<ParsedResumeOutput>;
}

export interface IProfileService {
  getProfile(candidateId: string): Promise<CandidateProfile>;
  saveProfile(candidateId: string, profile: CandidateProfile, isDraft?: boolean): Promise<CandidateProfile>;
  calculateCompleteness(profile: CandidateProfile): {
    score: number;
    missingSections: string[];
    completedSections: string[];
  };
}

export interface ITalentCheckService {
  getCompanies(): Promise<CompanyExpectationProfile[]>;
  runTalentCheck(profile: CandidateProfile, companyName: string): Promise<TalentCheckResult>;
}

export interface ISkillMatchingService {
  runSkillMatching(profile: CandidateProfile, jd: ExtractedSkillList): Promise<SkillMatchingResult>;
}
