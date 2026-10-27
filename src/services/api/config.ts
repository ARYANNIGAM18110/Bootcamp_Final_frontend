/**
 * CENTRALIZED API CONFIGURATION
 *
 * When integrating the five independently developed RADIX backend modules:
 * 1. Set VITE_API_BASE_URL in `.env` (e.g. `http://localhost:8000/api/v1`)
 * 2. Set VITE_USE_MOCK_API="false"
 * 3. Adjust endpoint paths in `API_ENDPOINTS` below if your team's Python/LangChain
 *    routes use custom paths.
 */

export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  useMock: import.meta.env.VITE_USE_MOCK_API !== 'false',
  timeoutMs: 30000,
};

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    logout: '/auth/logout',
    session: '/auth/session',
  },
  // Role 1: JD Analytics (LLM Extraction)
  jdAnalytics: {
    analyzeFile: '/jd-analytics/extract',
    listSaved: '/jd-analytics/list',
  },
  // Role 2: Resume Parsing (LLM Extraction)
  resumeParsing: {
    parseFile: '/resume-parsing/extract',
  },
  // Role 3: Profile Builder (JSON / Supabase persistence)
  profile: {
    get: '/profile',
    save: '/profile',
  },
  // Role 4: Talent Check (12-category company readiness comparison)
  talentCheck: {
    evaluate: '/talent-check/evaluate',
    companies: '/talent-check/companies',
  },
  // Role 5: Skill Matching (Fuzzy/LLM match between profile and specific JD)
  skillMatching: {
    match: '/skill-matching/compare',
  },
};
