import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader,
  Button,
  ScoreRing,
  Progress,
  Skeleton,
} from '../../components/ui/primitives';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CATEGORY_LOOKUP } from '../../data/radixCategories';

export const SkillMatchingPage: React.FC = () => {
  const {
    activeProfile,
    activeProfileSession,
    activeJDSession,
    setSelectedJDId,
    executeSkillMatching,
    activeSkillMatchSession,
    updateActiveSkillMatchSession,
  } = useWorkspace();
  const navigate = useNavigate();

  // Persisted across the session until sign-out or a new entry selection occurs
  const {
    candidateSource,
    jdSource,
    importedProfile,
    importedJD,
    displayedResult: matchResult,
  } = activeSkillMatchSession;

  const [isMatching, setIsMatching] = useState<boolean>(false);

  const hasProfileData = Boolean(
    activeProfileSession.hasSavedProfile && activeProfile.name.trim()
  );
  const hasJDData = Boolean(
    activeJDSession.hasAnalyzed && activeJDSession.displayedResult
  );

  // Clear stale imported selections if the underlying source module (Module 03 or Module 01) is empty
  useEffect(() => {
    if (!hasProfileData && (candidateSource || importedProfile)) {
      updateActiveSkillMatchSession({
        candidateSource: '',
        importedProfile: null,
        hasMatched: false,
        displayedResult: null,
      });
    }
    if (!hasJDData && (jdSource || importedJD)) {
      updateActiveSkillMatchSession({
        jdSource: '',
        importedJD: null,
        hasMatched: false,
        displayedResult: null,
      });
    }
  }, [
    hasProfileData,
    hasJDData,
    candidateSource,
    jdSource,
    importedProfile,
    importedJD,
    updateActiveSkillMatchSession,
  ]);

  const handleCandidateSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;

    if (val === 'profile_builder') {
      if (!hasProfileData) {
        toast.error('Profile Builder (Module 03) is empty. Please save a candidate profile first.');
        updateActiveSkillMatchSession({
          candidateSource: '',
          importedProfile: null,
          hasMatched: false,
          displayedResult: null,
        });
        return;
      }
      updateActiveSkillMatchSession({
        candidateSource: val,
        importedProfile: activeProfile,
        hasMatched: false,
        displayedResult: null,
      });
      toast.success(
        `Imported candidate profile from Profile Builder: ${activeProfile.name} (${activeProfile.skills.length} skills)`
      );
    } else {
      updateActiveSkillMatchSession({
        candidateSource: '',
        importedProfile: null,
        hasMatched: false,
        displayedResult: null,
      });
    }
  };

  const handleJDSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;

    if (val === 'jd_analytics') {
      const targetJD =
        activeJDSession.hasAnalyzed && activeJDSession.displayedResult
          ? activeJDSession.displayedResult
          : null;
      if (targetJD) {
        updateActiveSkillMatchSession({
          jdSource: val,
          importedJD: targetJD,
          hasMatched: false,
          displayedResult: null,
        });
        if (targetJD.id) {
          setSelectedJDId(targetJD.id);
        }
        toast.success(
          `Imported target job posting from JD Analytics: ${targetJD.company} — ${targetJD.role}`
        );
      } else {
        toast.error('JD Analytics (Module 01) is empty. Please analyze a Job Description first.');
        updateActiveSkillMatchSession({
          jdSource: '',
          importedJD: null,
          hasMatched: false,
          displayedResult: null,
        });
      }
    } else {
      updateActiveSkillMatchSession({
        jdSource: '',
        importedJD: null,
        hasMatched: false,
        displayedResult: null,
      });
    }
  };

  const handleManualRun = async () => {
    if (!hasProfileData || candidateSource !== 'profile_builder' || !importedProfile) {
      toast.error('Please import a saved profile from Profile Builder (Module 03) in step 1 first.');
      return;
    }
    if (!hasJDData || jdSource !== 'jd_analytics' || !importedJD) {
      toast.error('Please import an analyzed JD from JD Analytics (Module 01) in step 2 first.');
      return;
    }

    const latestProfile = activeProfile;
    const latestJD = activeJDSession.displayedResult || importedJD;

    setIsMatching(true);
    try {
      const res = await executeSkillMatching(latestJD, latestProfile);
      updateActiveSkillMatchSession({
        importedProfile: latestProfile,
        importedJD: latestJD,
        hasMatched: true,
        displayedResult: res,
      });
      toast.success(
        `Matched ${latestProfile.name} against ${latestJD.role} (${latestJD.company}): ${res.match_score}/100`
      );
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="MODULE 05 · ROLE 5 (SKILL MATCHING)"
        title="Job-Specific Skill Matching & Missing Gap Analysis"
        description="Compare your candidate profile against one specific job posting (from Role 1 JD Analytics). Prioritizes an actionable missing-skill gap list alongside your match score."
      />

      {/* Selection Bar */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-5 space-y-1.5">
          <label
            htmlFor="select-sm-candidate-source"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            1. Select Candidate Profile (From Role 3 Profile Builder)
          </label>
          <select
            id="select-sm-candidate-source"
            value={candidateSource}
            onChange={handleCandidateSourceChange}
            className="w-full h-10 px-3 text-sm rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
          >
            <option value="">-- Select Option --</option>
            <option value="profile_builder" disabled={!hasProfileData}>
              {hasProfileData
                ? 'Import from Profile Builder'
                : 'Import from Profile Builder (No Profile in Module 03)'}
            </option>
          </select>
          {!hasProfileData && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Module 03 (Profile Builder) is empty. Save a profile first to enable import.
              </span>
            </div>
          )}
          {hasProfileData && importedProfile && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Imported: {importedProfile.name} ({importedProfile.skills.length} skills tagged)
              </span>
            </div>
          )}
        </div>

        <div className="md:col-span-5 space-y-1.5">
          <label
            htmlFor="select-sm-jd-source"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            2. Select Target Job Posting (From Role 1 JD Analytics)
          </label>
          <select
            id="select-sm-jd-source"
            value={jdSource}
            onChange={handleJDSourceChange}
            className="w-full h-10 px-3 text-sm rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
          >
            <option value="">-- Select Option --</option>
            <option value="jd_analytics" disabled={!hasJDData}>
              {hasJDData
                ? 'Import from JD Analytics'
                : 'Import from JD Analytics (No JD Analyzed in Module 01)'}
            </option>
          </select>
          {!hasJDData && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Module 01 (JD Analytics) is empty. Analyze a JD first to enable import.
              </span>
            </div>
          )}
          {hasJDData && importedJD && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Imported: {importedJD.company} — {importedJD.role} ({importedJD.skills.length} JD skills)
              </span>
            </div>
          )}
        </div>

        <div className="md:col-span-2 md:pt-[22px]">
          <Button
            variant="primary"
            className="w-full h-10"
            onClick={handleManualRun}
            isLoading={isMatching}
          >
            <GitCompare className="w-4 h-4" />
            <span>Run Skill Match</span>
          </Button>
        </div>
      </div>

      {isMatching && (
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isMatching && matchResult && importedProfile && importedJD && (
        <>
          {/* Match Score Overview & Role Metadata */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center gap-4">
              <ScoreRing
                score={matchResult.match_score}
                size={136}
                strokeWidth={10}
                label="Role Skill Match Score"
                sublabel={`${importedJD.role} · ${importedJD.company}`}
              />
              <div className="w-full pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">
                    {matchResult.matched_skills.length}
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Matched Skills
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                  <span className="font-mono font-bold text-base text-red-700 dark:text-red-400">
                    {matchResult.missing_skills.length}
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Missing Skills (Gaps)
                  </p>
                </div>
              </div>
            </div>

            {/* Target JD Breakdown & Actionable Next Steps */}
            <div className="lg:col-span-8 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                      SOURCE JD: {matchResult.jd_source_file}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {importedProfile.name} → {importedJD.role} ({importedJD.company})
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {importedJD.skills.length} Total JD Requirements
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {importedJD.summary}
                </p>

                <Progress
                  value={matchResult.match_score}
                  label="Requirement Coverage Score"
                  showValue
                  tone={
                    matchResult.match_score >= 75
                      ? 'emerald'
                      : matchResult.match_score >= 55
                      ? 'indigo'
                      : 'amber'
                  }
                />
              </div>

              {/* Recommended Next Steps for This Specific Posting */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Recommended Preparation Steps for {importedJD.role}
                </h3>
                {matchResult.missing_skills.length === 0 ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Your profile covers every extracted skill requirement in this JD! Review partial/adjacent notes below to sharpen interview evidence.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {matchResult.missing_skills.slice(0, 3).map((ms, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>
                          Build project or coursework evidence in{' '}
                          <strong className="text-slate-900 dark:text-white">
                            {ms.skill_name} ({ms.category_code})
                          </strong>{' '}
                          and add it to Profile Builder.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Missing Skills — Gap List (Full-Width Division Placed Below Overview Cards) */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Missing Skills — Gap List ({matchResult.missing_skills.length})</span>
              </h3>
              <span className="text-xs font-mono text-red-600 dark:text-red-400">
                MISSING FROM PROFILE
              </span>
            </div>

            {matchResult.missing_skills.length === 0 ? (
              <div className="p-6 text-center rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Zero Missing Skills for This Role
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {importedProfile.name}&apos;s profile demonstrates coverage across all extracted requirements in {importedJD.source_file}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matchResult.missing_skills.map((skill, idx) => {
                  const cat = CATEGORY_LOOKUP[skill.category_code];
                  return (
                    <div
                      key={`${skill.skill_name}-${idx}`}
                      className="p-4 rounded-xl border border-red-200/80 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/15 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {skill.skill_name}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-red-600 dark:text-red-400 shrink-0">
                          {skill.category_code} · {cat?.shortName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        JD Requirement: {skill.evidence}
                      </p>
                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-500">
                          JD Importance: {skill.confidence.toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate('/app/profile')}
                          className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          + Add in Profile Builder →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Matched Skills (Full-Width Division Below) */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Matched Skills ({matchResult.matched_skills.length})</span>
              </h3>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                VERIFIED IN PROFILE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matchResult.matched_skills.map((skill, idx) => {
                const cat = CATEGORY_LOOKUP[skill.category_code];
                return (
                  <div
                    key={`${skill.skill_name}-${idx}`}
                    className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/15 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {skill.skill_name}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                        {skill.category_code} · {cat?.shortName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {skill.evidence}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Partial / Fuzzy Match Notes */}
          {matchResult.partial_skills && matchResult.partial_skills.length > 0 && (
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Partially Matched / Adjacent Competency Notes ({matchResult.partial_skills.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matchResult.partial_skills.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/15 text-xs space-y-1"
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">
                      JD Requirement: {item.jd_skill.skill_name} ({item.jd_skill.category_code})
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      {item.similarity_note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
