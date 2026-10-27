import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  GitCompare,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { toast } from 'sonner';
import {
  PageHeader,
  Button,
  ScoreRing,
  Progress,
  Skeleton,
} from '../../components/ui/primitives';
import { useWorkspace } from '../../context/WorkspaceContext';
import { COMPANY_SKILLSET_SNAPSHOT } from '../../data/mockDataset';
import { CATEGORY_LOOKUP, RADIX_TWELVE_CATEGORIES } from '../../data/radixCategories';
import {
  TalentCheckResult,
  RadixCategoryCode,
} from '../../types/radix';

export const TalentCheckPage: React.FC = () => {
  const {
    activeProfile,
    activeProfileSession,
    activeJDSession,
    setSelectedCompany,
    executeTalentCheck,
    activeTalentCheckSession,
    updateActiveTalentCheckSession,
  } = useWorkspace();
  const navigate = useNavigate();

  // Persisted across the session until sign-out or a new entry selection occurs
  const {
    candidateSource,
    benchmarkSource,
    importedProfile,
    importedJD,
    displayedResult: currentResult,
  } = activeTalentCheckSession;

  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const hasProfileData = Boolean(
    activeProfileSession.hasSavedProfile && activeProfile.name.trim()
  );
  const hasJDData = Boolean(
    activeJDSession.hasAnalyzed && activeJDSession.displayedResult
  );

  // Clear stale imported selections if the underlying source module (Module 03 or Module 01) is empty
  useEffect(() => {
    if (!hasProfileData && (candidateSource || importedProfile)) {
      updateActiveTalentCheckSession({
        candidateSource: '',
        importedProfile: null,
        hasEvaluated: false,
        displayedResult: null,
      });
    }
    if (!hasJDData && (benchmarkSource || importedJD)) {
      updateActiveTalentCheckSession({
        benchmarkSource: '',
        importedJD: null,
        hasEvaluated: false,
        displayedResult: null,
      });
    }
  }, [
    hasProfileData,
    hasJDData,
    candidateSource,
    benchmarkSource,
    importedProfile,
    importedJD,
    updateActiveTalentCheckSession,
  ]);

  const handleCandidateSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;

    if (val === 'profile_builder') {
      if (!hasProfileData) {
        toast.error('Profile Builder (Module 03) is empty. Please save a candidate profile first.');
        updateActiveTalentCheckSession({
          candidateSource: '',
          importedProfile: null,
          hasEvaluated: false,
          displayedResult: null,
        });
        return;
      }
      updateActiveTalentCheckSession({
        candidateSource: val,
        importedProfile: activeProfile,
        hasEvaluated: false,
        displayedResult: null,
      });
      toast.success(
        `Imported candidate profile from Profile Builder: ${activeProfile.name} (${activeProfile.skills.length} skills)`
      );
    } else {
      updateActiveTalentCheckSession({
        candidateSource: '',
        importedProfile: null,
        hasEvaluated: false,
        displayedResult: null,
      });
    }
  };

  const handleBenchmarkSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;

    if (val === 'jd_analytics') {
      const targetJD =
        activeJDSession.hasAnalyzed && activeJDSession.displayedResult
          ? activeJDSession.displayedResult
          : null;
      if (targetJD) {
        updateActiveTalentCheckSession({
          benchmarkSource: val,
          importedJD: targetJD,
          hasEvaluated: false,
          displayedResult: null,
        });
        setSelectedCompany(targetJD.company);
        toast.success(
          `Imported target benchmark from JD Analytics: ${targetJD.company} — ${targetJD.role}`
        );
      } else {
        toast.error('JD Analytics (Module 01) is empty. Please analyze a Job Description first.');
        updateActiveTalentCheckSession({
          benchmarkSource: '',
          importedJD: null,
          hasEvaluated: false,
          displayedResult: null,
        });
      }
    } else {
      updateActiveTalentCheckSession({
        benchmarkSource: '',
        importedJD: null,
        hasEvaluated: false,
        displayedResult: null,
      });
    }
  };

  const companyMeta = useMemo(() => {
    const targetCompanyName = importedJD?.company || '';
    const matchedSnapshot = COMPANY_SKILLSET_SNAPSHOT.find(
      (c) =>
        c.company.toLowerCase() === targetCompanyName.toLowerCase() ||
        c.shortName.toLowerCase() === targetCompanyName.toLowerCase()
    );

    if (matchedSnapshot) {
      return {
        ...matchedSnapshot,
        company: importedJD ? `${importedJD.company} (${importedJD.role})` : matchedSnapshot.company,
        shortName: importedJD?.company || matchedSnapshot.shortName,
        evaluationSummary:
          importedJD?.summary || matchedSnapshot.evaluationSummary,
      };
    }

    return {
      company: importedJD ? `${importedJD.company} (${importedJD.role})` : 'Target JD Benchmark',
      shortName: importedJD?.company || 'JD Benchmark',
      tierDescriptor: importedJD
        ? `Imported from JD Analytics · ${importedJD.source_file}`
        : 'JD Analytics Benchmark',
      headquarters: importedJD?.location || 'Flexible / Hybrid',
      readinessThreshold: 75,
      evaluationSummary:
        importedJD?.summary ||
        'Evaluated against the 12-category competency bar derived from your analyzed Job Description in Module 01.',
      expectedLevels: COMPANY_SKILLSET_SNAPSHOT[0].expectedLevels,
    };
  }, [importedJD]);

  const handleManualRun = async () => {
    if (!hasProfileData || candidateSource !== 'profile_builder' || !importedProfile) {
      toast.error('Please import a saved profile from Profile Builder (Module 03) in step 1 first.');
      return;
    }
    if (!hasJDData || benchmarkSource !== 'jd_analytics' || !importedJD) {
      toast.error('Please import an analyzed JD from JD Analytics (Module 01) in step 2 first.');
      return;
    }

    // Always use the latest saved activeProfile from Profile Builder and latest JD when running
    const latestProfile = activeProfile;
    const latestJD = activeJDSession.displayedResult || importedJD;

    setIsEvaluating(true);
    try {
      const baseRes = await executeTalentCheck(latestJD.company, latestProfile);

      const matchedSnapshot = COMPANY_SKILLSET_SNAPSHOT.find(
        (c) =>
          c.company.toLowerCase() === latestJD.company.toLowerCase() ||
          c.shortName.toLowerCase() === latestJD.company.toLowerCase()
      );

      if (!matchedSnapshot && latestJD.skills.length > 0) {
        let weightedEarned = 0;
        let totalWeight = 0;

        const customGap = RADIX_TWELVE_CATEGORIES.map((cat) => {
          const code = cat.code as Exclude<RadixCategoryCode, 'OTHER'>;
          const jdCatSkills = latestJD.skills.filter((s) => s.category_code === code);
          const hasHigh = jdCatSkills.some((s) => s.confidence === 'high');
          const required_level =
            jdCatSkills.length > 0 ? (hasHigh ? 8 : 7) : 6;

          const baseRow = baseRes.skillset_gap.find((r) => r.category_code === code);
          const candidate_level = baseRow ? baseRow.candidate_level : 2;
          const gap = candidate_level < required_level;

          const categoryAchievement = Math.min(1.05, candidate_level / required_level);
          weightedEarned += categoryAchievement * required_level;
          totalWeight += required_level;

          return {
            category_code: code as RadixCategoryCode,
            required_level,
            candidate_level,
            gap,
          };
        });

        const readiness_score = Math.min(
          100,
          Math.max(0, Math.round((weightedEarned / totalWeight) * 100))
        );

        const tailoredResult: TalentCheckResult = {
          ...baseRes,
          company: latestJD.company,
          skillset_gap: customGap,
          readiness_score,
        };
        updateActiveTalentCheckSession({
          importedProfile: latestProfile,
          importedJD: latestJD,
          hasEvaluated: true,
          displayedResult: tailoredResult,
        });
        toast.success(
          `Evaluated ${latestProfile.name} against ${latestJD.company}: Readiness ${readiness_score}/100`
        );
      } else {
        const finalResult: TalentCheckResult = {
          ...baseRes,
          company: latestJD.company,
        };
        updateActiveTalentCheckSession({
          importedProfile: latestProfile,
          importedJD: latestJD,
          hasEvaluated: true,
          displayedResult: finalResult,
        });
        toast.success(
          `Evaluated ${latestProfile.name} against ${latestJD.company}: Readiness ${baseRes.readiness_score}/100`
        );
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const chartData = useMemo(() => {
    if (!currentResult) return [];
    return currentResult.skillset_gap.map((item) => ({
      category: item.category_code,
      name:
        CATEGORY_LOOKUP[item.category_code as RadixCategoryCode]?.shortName ||
        item.category_code,
      Candidate: item.candidate_level,
      Required: item.required_level,
    }));
  }, [currentResult]);

  const gapCategories = useMemo(
    () => (currentResult ? currentResult.skillset_gap.filter((g) => g.gap) : []),
    [currentResult]
  );

  const metCategories = useMemo(
    () => (currentResult ? currentResult.skillset_gap.filter((g) => !g.gap) : []),
    [currentResult]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="MODULE 04 · ROLE 4 (TALENT CHECK)"
        title="12-Category Company Readiness Benchmark"
        description="Compare a candidate's saved profile against a company's expected bar across all 12 RADIX skillsets and inspect per-category competency gaps."
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate('/app/skill-matching')}>
            <GitCompare className="w-4 h-4" />
            <span>Job-Specific Skill Match →</span>
          </Button>
        }
      />

      {/* Transparent Prototype Notice */}
      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/25 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
        <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-slate-900 dark:text-white">
            How Talent Check Evaluates Readiness:
          </span>{' '}
          Import your candidate profile from Profile Builder and your target benchmark from JD Analytics, then click Run Talent Check to evaluate readiness across all 12 RADIX skill categories.
        </p>
      </div>

      {/* Controls Bar: Import from Profile Builder + Import from JD Analytics + Run Action */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-5 space-y-1.5">
          <label
            htmlFor="select-candidate-source"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            1. Select Candidate Profile (From Profile Builder)
          </label>
          <select
            id="select-candidate-source"
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
            htmlFor="select-benchmark-source"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            2. Select Target Company Benchmark
          </label>
          <select
            id="select-benchmark-source"
            value={benchmarkSource}
            onChange={handleBenchmarkSourceChange}
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
            isLoading={isEvaluating}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Run Talent Check</span>
          </Button>
        </div>
      </div>

      {isEvaluating && (
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isEvaluating && currentResult && importedProfile && (
        <>
          {/* Summary Readiness Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center gap-4">
              <ScoreRing
                score={currentResult.readiness_score}
                size={136}
                strokeWidth={10}
                label={`Overall Readiness — ${companyMeta.shortName}`}
                sublabel={
                  currentResult.readiness_score >= companyMeta.readinessThreshold
                    ? `Meets Illustrative Bar (≥ ${companyMeta.readinessThreshold}/100)`
                    : `Below Illustrative Bar (Target ${companyMeta.readinessThreshold}/100)`
                }
              />

              <div className="w-full pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">
                    {metCategories.length} / 12
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Categories At/Above Bar
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <span className="font-mono font-bold text-base text-amber-700 dark:text-amber-400">
                    {gapCategories.length} / 12
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Categories With Gap
                  </p>
                </div>
              </div>
            </div>

            {/* Company Expectation Context & Bar Chart */}
            <div className="lg:col-span-8 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 dark:text-indigo-400">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{companyMeta.tierDescriptor}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {importedProfile.name} vs. {companyMeta.company}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                    {companyMeta.evaluationSummary}
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="category"
                      tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    <YAxis domain={[0, 10]} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Candidate" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Required" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Complete 12-Category Comparison Table */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Full 12-Category RADIX Skillset Gap Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Explicit text status labels accompany color indicators for accessibility.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 pr-4 font-medium">Category Code &amp; Name</th>
                    <th className="py-2.5 px-4 font-medium text-right">Company Required Level</th>
                    <th className="py-2.5 px-4 font-medium text-right">Candidate Level</th>
                    <th className="py-2.5 px-4 font-medium">Coverage Progress</th>
                    <th className="py-2.5 pl-4 font-medium text-right">Gap Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {currentResult.skillset_gap.map((row) => {
                    const meta = CATEGORY_LOOKUP[row.category_code];
                    const ratio = Math.min(
                      100,
                      Math.round((row.candidate_level / row.required_level) * 100)
                    );
                    return (
                      <tr
                        key={row.category_code}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3 pr-4">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-2">
                            {row.category_code}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {meta?.name || row.category_code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {row.required_level} / 10
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {row.candidate_level} / 10
                        </td>
                        <td className="py-3 px-4 w-48">
                          <Progress
                            value={ratio}
                            tone={row.gap ? 'amber' : 'emerald'}
                          />
                        </td>
                        <td className="py-3 pl-4 text-right font-mono whitespace-nowrap">
                          {row.gap ? (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">
                              GAP (-{row.required_level - row.candidate_level} lvl)
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              READY (+{row.candidate_level - row.required_level} lvl)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
