/**
 * SHARED DATA CONTRACT — RADIX TALENT MATCH HACKATHON
 *
 * This module defines the canonical data structures exchanged between the five
 * RADIX Talent Match modules:
 *   01. JD Analytics
 *   02. Resume Parsing
 *   03. Profile Builder
 *   04. Talent Check
 *   05. Skill Matching
 *
 * All shared contract fields match the official hackathon brief exactly.
 * Optional frontend metadata fields are clearly marked and preserved separately
 * from required transport properties.
 */

export type RadixCategoryCode =
  | 'COD'
  | 'DSA'
  | 'OOD'
  | 'APTI'
  | 'COMM'
  | 'AI'
  | 'CLOUD'
  | 'SQL'
  | 'SWE'
  | 'SYSD'
  | 'NETW'
  | 'OS'
  | 'OTHER';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * The fundamental building block: a single skill tagged with one of the 12
 * RADIX category codes (or OTHER).
 */
export interface Skill {
  skill_name: string;
  category_code: RadixCategoryCode;
  evidence: string;
  confidence: ConfidenceLevel;
  /**
   * Optional frontend proficiency rating (1-10) used in Profile Builder
   * to allow candidates to self-assess or refine their competency level.
   */
  proficiency_level?: number;
}

/**
 * Role 1 (JD Analytics) & Role 2 (Resume Parsing) shared output contract.
 */
export interface ExtractedSkillList {
  source_type: 'jd' | 'resume';
  source_file: string;
  company: string;
  role: string;
  skills: Skill[];
  // Optional metadata for UI display & persistence
  id?: string;
  location?: string;
  analyzed_at?: string;
  summary?: string;
  required_technologies?: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_year: string;
  score_or_gpa: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  link?: string;
}

export interface Hackathon {
  id: string;
  name: string;
  organizer: string;
  year: string;
  achievement: string;
  project_summary: string;
}

export interface Internship {
  id: string;
  company: string;
  role: string;
  duration: string;
  description: string;
  technologies: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
  credential_id?: string;
}

/**
 * Role 2 (Resume Parsing) extended response that wraps the shared ExtractedSkillList
 * with structured resume fields (education, projects, experience) for import into Role 3.
 */
export interface ParsedResumeOutput extends ExtractedSkillList {
  candidate_name: string;
  candidate_email: string;
  phone?: string;
  location?: string;
  profile_archetype?: string;
  fit_summary?: string;
  education: Education[];
  projects: ProjectItem[];
  internships: Internship[];
  hackathons: Hackathon[];
  certifications: Certification[];
  preferred_roles: string[];
}

/**
 * Role 3 (Profile Builder) shared output contract.
 * Note: In the brief's JSON illustration, `education` is shown as `"..."` or structured array;
 * we support structured `Education[]` as specified in Section 14 of the build specification,
 * plus optional `projects` so Resume Parsing imports without data loss.
 */
export interface CandidateProfile {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  headline?: string;
  bio?: string;
  education: Education[];
  skills: Skill[];
  projects?: ProjectItem[];
  hackathons: Hackathon[];
  internships: Internship[];
  certifications: Certification[];
  preferred_roles: string[];
  cv_file: string;
  updated_at?: string;
  is_draft?: boolean;
}

export interface SkillsetGapItem {
  category_code: RadixCategoryCode;
  required_level: number; // 1-10 scale
  candidate_level: number; // 1-10 scale
  gap: boolean;
}

/**
 * Role 4 (Talent Check) shared output contract.
 */
export interface TalentCheckResult {
  id?: string;
  candidate_name?: string;
  company: string;
  skillset_gap: SkillsetGapItem[];
  readiness_score: number; // 0-100
  evaluated_at?: string;
}

/**
 * Role 5 (Skill Matching) shared output contract.
 */
export interface SkillMatchingResult {
  id?: string;
  candidate_name?: string;
  company?: string;
  role?: string;
  jd_source_file: string;
  match_score: number; // 0-100
  matched_skills: Skill[];
  missing_skills: Skill[];
  /**
   * Optional frontend extension for fuzzy/adjacent matches where candidate has
   * related category competency or equivalent tooling.
   */
  partial_skills?: Array<{
    jd_skill: Skill;
    candidate_skill: Skill;
    similarity_note: string;
  }>;
  evaluated_at?: string;
}

export interface ActivityRecord {
  id: string;
  type: 'jd_analytics' | 'resume_parsing' | 'profile_update' | 'talent_check' | 'skill_matching';
  title: string;
  subtitle: string;
  timestamp: string;
  score?: number;
  route: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  selectedCandidateId: string;
  createdAt: string;
}
