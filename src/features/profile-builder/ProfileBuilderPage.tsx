import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  Plus,
  Trash2,
  Download,
  ShieldCheck,
  GitCompare,
  FileUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader,
  Button,
  Input,
  Select,
  Progress,
  FileUpload,
  ConfirmDialog,
} from '../../components/ui/primitives';
import { useWorkspace } from '../../context/WorkspaceContext';
import { profileService } from '../../services/mock';
import {
  CandidateProfile,
  RadixCategoryCode,
  ConfidenceLevel,
} from '../../types/radix';
import { RADIX_TWELVE_CATEGORIES, CATEGORY_LOOKUP } from '../../data/radixCategories';
import { SAMPLE_PARSED_RESUMES, parsedResumeToCandidateProfile } from '../../data/mockDataset';
import { cn } from '../../utils/cn';

type SectionTab =
  | 'basic'
  | 'skills'
  | 'education'
  | 'projects'
  | 'internships'
  | 'hackathons'
  | 'certifications'
  | 'roles_cv';

const SECTION_TABS: Array<{ id: SectionTab; label: string }> = [
  { id: 'basic', label: '1. Basic Details' },
  { id: 'skills', label: '2. Skills & Proficiency' },
  { id: 'education', label: '3. Education' },
  { id: 'projects', label: '4. Projects' },
  { id: 'internships', label: '5. Internships' },
  { id: 'hackathons', label: '6. Hackathons' },
  { id: 'certifications', label: '7. Certifications' },
  { id: 'roles_cv', label: '8. Preferred Roles & CV' },
];

/**
 * Automatically computes a 1–10 skill proficiency rating based on the
 * richness, technical depth, and quantified impact of the Evidence / Project Context.
 */
function computeProficiencyFromEvidence(
  evidenceText: string,
  confidence: ConfidenceLevel
): number {
  const clean = evidenceText.trim().toLowerCase();
  if (!clean) {
    return confidence === 'high' ? 6 : confidence === 'medium' ? 5 : 4;
  }

  let score = confidence === 'high' ? 6 : confidence === 'medium' ? 5 : 4;

  // High-complexity / production / architecture / optimization signals
  const advancedSignals = [
    'architect',
    'distributed',
    'production',
    'scalable',
    'microservice',
    'latency',
    'throughput',
    'optimized',
    'benchmark',
    'consensus',
    'sharding',
    'concurrent',
    'published',
    'lead',
    'mentored',
    'ci/cd',
    'kubernetes',
  ];

  // Hands-on implementation / project / internship signals
  const implementationSignals = [
    'built',
    'developed',
    'implemented',
    'deployed',
    'designed',
    'engineered',
    'integrated',
    'automated',
    'internship',
    'hackathon',
    'pipeline',
    'api',
    'database',
    'solved',
  ];

  const advHits = advancedSignals.filter((kw) => clean.includes(kw)).length;
  const impHits = implementationSignals.filter((kw) => clean.includes(kw)).length;
  const hasQuantifiedMetrics = /\b(\d+%|\d+x|\d+\+|\d{2,}\s*(ms|rps|users|nodes|problems|queries|services))\b/i.test(
    clean
  );

  if (advHits >= 2) score += 2;
  else if (advHits === 1) score += 1;

  if (impHits >= 2) score += 1;
  if (hasQuantifiedMetrics) score += 1;
  if (clean.split(/\s+/).length >= 12) score += 1;

  return Math.max(1, Math.min(10, score));
}

export const ProfileBuilderPage: React.FC = () => {
  const {
    activeProfile,
    saveCandidateProfile,
    latestParsedResume,
    importParsedResumeToProfile,
  } = useWorkspace();
  const navigate = useNavigate();

  const [formState, setFormState] = useState<CandidateProfile>(activeProfile);
  const [activeTab, setActiveTab] = useState<SectionTab>('skills');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [cvFileObj, setCvFileObj] = useState<File | null>(null);

  // New skill quick-add form state (proficiency is computed automatically from evidence)
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<RadixCategoryCode>('COD');
  const [newSkillEvidence, setNewSkillEvidence] = useState('');
  const [newSkillConfidence, setNewSkillConfidence] = useState<ConfidenceLevel>('high');

  // Preferred role input
  const [newRoleInput, setNewRoleInput] = useState('');

  useEffect(() => {
    const normalizedSkills = (activeProfile.skills || []).map((s) => ({
      ...s,
      proficiency_level: computeProficiencyFromEvidence(s.evidence, s.confidence),
    }));
    setFormState({
      ...activeProfile,
      skills: normalizedSkills,
    });
    setIsDirty(false);
  }, [activeProfile]);

  const liveCompleteness = profileService.calculateCompleteness(formState);

  const updateField = <K extends keyof CandidateProfile>(
    field: K,
    value: CandidateProfile[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!formState.name.trim() || !formState.email.trim()) {
      toast.error('Name and Email are required in Basic Details.');
      setActiveTab('basic');
      return;
    }

    setIsSaving(true);
    try {
      const normalizedProfile: CandidateProfile = {
        ...formState,
        skills: formState.skills.map((s) => ({
          ...s,
          proficiency_level: computeProficiencyFromEvidence(s.evidence, s.confidence),
        })),
      };
      await saveCandidateProfile(normalizedProfile, false);
      setIsDirty(false);
      toast.success('Saved candidate profile to workspace.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) {
      toast.error('Please enter a skill or technology name.');
      return;
    }
    if (!newSkillEvidence.trim()) {
      toast.error('Please provide Evidence / Project Context so proficiency can be evaluated.');
      return;
    }

    const computedLevel = computeProficiencyFromEvidence(
      newSkillEvidence,
      newSkillConfidence
    );

    const added = {
      skill_name: newSkillName.trim(),
      category_code: newSkillCategory,
      evidence: newSkillEvidence.trim(),
      confidence: newSkillConfidence,
      proficiency_level: computedLevel,
    };
    updateField('skills', [added, ...formState.skills]);
    setNewSkillName('');
    setNewSkillEvidence('');
    toast.success(
      `Added ${added.skill_name} (${added.category_code}) · Evaluated Proficiency: ${computedLevel}/10`
    );
  };

  const handleImportLatestResume = async () => {
    if (!latestParsedResume) {
      toast.info('No parsed resume found; importing default sample candidate.');
      return;
    }
    await importParsedResumeToProfile(latestParsedResume);
    setIsDirty(false);
    toast.success(`Imported ${latestParsedResume.candidate_name}'s parsed resume data.`);
  };

  const handleResetToDefaultPersona = () => {
    const sample =
      SAMPLE_PARSED_RESUMES.find((r) => r.id === formState.id) || SAMPLE_PARSED_RESUMES[0];
    const fresh = parsedResumeToCandidateProfile(sample);
    setFormState(fresh);
    setIsDirty(true);
    toast.info(`Reset editor to default ${sample.candidate_name} hackathon dataset.`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="MODULE 03 · ROLE 3 (PROFILE BUILDER)"
        title="Comprehensive Candidate Profile Editor"
        description="Build and maintain your full professional profile beyond the resume—add evidence-backed technical skills, hackathons, internships, certifications, and preferred roles."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleImportLatestResume}>
              <Download className="w-4 h-4" />
              <span>Import Parsed Resume</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
            >
              <Save className="w-4 h-4" />
              <span>Save Profile</span>
            </Button>
          </>
        }
      />

      {isDirty && (
        <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              You have unsaved changes in the Profile Editor. Save your profile before running Talent Check or Skill Matching so your latest edits are evaluated.
            </span>
          </div>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save Now
          </Button>
        </div>
      )}

      {/* Section Navigation Tabs — Strictly 4 in Row 1 and 4 in Row 2 (Fully Visible, No Scrollbar) */}
      <div className="grid grid-cols-4 gap-2.5 w-full">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-center leading-snug transition-colors cursor-pointer',
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Full-Width Active Section Editor Card */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
        {/* TAB 1: BASIC DETAILS */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Basic Candidate Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                value={formState.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
              <Input
                label="Email Address *"
                type="email"
                value={formState.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
              <Input
                label="Phone"
                value={formState.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
              />
              <Input
                label="Location"
                value={formState.location || ''}
                onChange={(e) => updateField('location', e.target.value)}
              />
            </div>
            <Input
              label="Professional Headline"
              value={formState.headline || ''}
              onChange={(e) => updateField('headline', e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Candidate Summary / Fit Note
              </label>
              <textarea
                rows={3}
                value={formState.bio || ''}
                onChange={(e) => updateField('bio', e.target.value)}
                className="w-full p-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        )}

        {/* TAB 2: SKILLS & PROFICIENCY (Structured Layout, Evidence-Driven Read-Only Proficiency) */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Technical Skills &amp; Evidence-Evaluated Proficiency
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Proficiency ratings (1–10) are automatically decided on the basis of your Evidence / Project Context and cannot be manually changed.
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/70 shrink-0">
                {formState.skills.length} Skills Tagged
              </span>
            </div>

            {/* Structured Add Skill Panel (No Proficiency Rating Box or Slider) */}
            <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Add New Tagged Skill to Profile
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  12 RADIX Categories
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <Input
                    label="Skill / Technology Name"
                    placeholder="e.g. Kubernetes & Helm"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                  />
                </div>
                <div className="md:col-span-4">
                  <Select
                    label="RADIX Category Code"
                    value={newSkillCategory}
                    onChange={(e) => setNewSkillCategory(e.target.value as RadixCategoryCode)}
                    options={[
                      ...RADIX_TWELVE_CATEGORIES.map((c) => ({
                        value: c.code,
                        label: `${c.code} — ${c.name}`,
                      })),
                      { value: 'OTHER', label: 'OTHER — Domain Specific' },
                    ]}
                  />
                </div>
                <div className="md:col-span-3">
                  <Select
                    label="Confidence Level"
                    value={newSkillConfidence}
                    onChange={(e) => setNewSkillConfidence(e.target.value as ConfidenceLevel)}
                    options={[
                      { value: 'high', label: 'High Confidence' },
                      { value: 'medium', label: 'Medium Confidence' },
                      { value: 'low', label: 'Low Confidence' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-10">
                  <Input
                    label="Evidence / Project Context"
                    placeholder="Short quote or proof of where you demonstrated this"
                    value={newSkillEvidence}
                    onChange={(e) => setNewSkillEvidence(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="w-full h-10"
                    onClick={handleAddSkill}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Skill</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Structured 2-Column Grid of Existing Skills (Locked, Evidence-Derived Proficiency) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formState.skills.map((skill, idx) => {
                const cat = CATEGORY_LOOKUP[skill.category_code];
                const level = computeProficiencyFromEvidence(
                  skill.evidence,
                  skill.confidence
                );

                return (
                  <div
                    key={`${skill.skill_name}-${idx}`}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 hover:border-indigo-500/40 transition-colors flex flex-col justify-between gap-4"
                  >
                    {/* Top Row: Category Badge, Confidence & Delete Button */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {skill.category_code}
                          </span>
                          <span className="text-slate-400 text-xs">·</span>
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                            {cat?.shortName || skill.category_code}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase',
                              skill.confidence === 'high'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                : skill.confidence === 'medium'
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60'
                                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
                            )}
                          >
                            {skill.confidence}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = formState.skills.filter((_, i) => i !== idx);
                              updateField('skills', next);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            aria-label={`Remove ${skill.skill_name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {skill.skill_name}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {skill.evidence}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: Locked Evidence-Evaluated Proficiency Indicator (Non-Editable) */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1.5 select-none">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          Evaluated from Evidence (Locked)
                        </span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {level} / 10
                        </span>
                      </div>
                      <Progress
                        value={level * 10}
                        tone={level >= 8 ? 'emerald' : level >= 6 ? 'indigo' : 'amber'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: EDUCATION */}
        {activeTab === 'education' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Education History
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateField('education', [
                    ...formState.education,
                    {
                      id: `edu-${Date.now()}`,
                      institution: 'University / College Name',
                      degree: 'B.E. / B.Tech',
                      field_of_study: 'Computer Science',
                      graduation_year: '2026',
                      score_or_gpa: '8.5 CGPA',
                    },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Education</span>
              </Button>
            </div>

            {formState.education.map((edu, idx) => (
              <div
                key={edu.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Academic Entry #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'education',
                        formState.education.filter((_, i) => i !== idx)
                      )
                    }
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Institution"
                    value={edu.institution}
                    onChange={(e) => {
                      const next = [...formState.education];
                      next[idx] = { ...next[idx], institution: e.target.value };
                      updateField('education', next);
                    }}
                  />
                  <Input
                    label="Degree"
                    value={edu.degree}
                    onChange={(e) => {
                      const next = [...formState.education];
                      next[idx] = { ...next[idx], degree: e.target.value };
                      updateField('education', next);
                    }}
                  />
                  <Input
                    label="Field of Study"
                    value={edu.field_of_study}
                    onChange={(e) => {
                      const next = [...formState.education];
                      next[idx] = { ...next[idx], field_of_study: e.target.value };
                      updateField('education', next);
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Grad Year"
                      value={edu.graduation_year}
                      onChange={(e) => {
                        const next = [...formState.education];
                        next[idx] = { ...next[idx], graduation_year: e.target.value };
                        updateField('education', next);
                      }}
                    />
                    <Input
                      label="CGPA / Percentage"
                      value={edu.score_or_gpa}
                      onChange={(e) => {
                        const next = [...formState.education];
                        next[idx] = { ...next[idx], score_or_gpa: e.target.value };
                        updateField('education', next);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: PROJECTS */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Technical Projects
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateField('projects', [
                    ...(formState.projects || []),
                    {
                      id: `proj-${Date.now()}`,
                      title: 'New Engineering Project',
                      description: 'Describe architecture, scale, and outcomes.',
                      technologies: ['Python', 'SQL'],
                    },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Project</span>
              </Button>
            </div>

            {(formState.projects || []).map((proj, idx) => (
              <div
                key={proj.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Project #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'projects',
                        (formState.projects || []).filter((_, i) => i !== idx)
                      )
                    }
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <Input
                  label="Project Title"
                  value={proj.title}
                  onChange={(e) => {
                    const next = [...(formState.projects || [])];
                    next[idx] = { ...next[idx], title: e.target.value };
                    updateField('projects', next);
                  }}
                />
                <Input
                  label="Description"
                  value={proj.description}
                  onChange={(e) => {
                    const next = [...(formState.projects || [])];
                    next[idx] = { ...next[idx], description: e.target.value };
                    updateField('projects', next);
                  }}
                />
                <Input
                  label="Technologies (comma-separated)"
                  value={proj.technologies.join(', ')}
                  onChange={(e) => {
                    const next = [...(formState.projects || [])];
                    next[idx] = {
                      ...next[idx],
                      technologies: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    };
                    updateField('projects', next);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: INTERNSHIPS */}
        {activeTab === 'internships' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Internships &amp; Work Experience
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateField('internships', [
                    ...formState.internships,
                    {
                      id: `int-${Date.now()}`,
                      company: 'Organization Name',
                      role: 'Software Engineering Intern',
                      duration: 'May 2025 – Jul 2025',
                      description: 'Key responsibilities and measurable impact.',
                      technologies: ['Java', 'SQL'],
                    },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Internship</span>
              </Button>
            </div>

            {formState.internships.map((intern, idx) => (
              <div
                key={intern.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Internship #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'internships',
                        formState.internships.filter((_, i) => i !== idx)
                      )
                    }
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Company"
                    value={intern.company}
                    onChange={(e) => {
                      const next = [...formState.internships];
                      next[idx] = { ...next[idx], company: e.target.value };
                      updateField('internships', next);
                    }}
                  />
                  <Input
                    label="Role"
                    value={intern.role}
                    onChange={(e) => {
                      const next = [...formState.internships];
                      next[idx] = { ...next[idx], role: e.target.value };
                      updateField('internships', next);
                    }}
                  />
                  <Input
                    label="Duration"
                    value={intern.duration}
                    onChange={(e) => {
                      const next = [...formState.internships];
                      next[idx] = { ...next[idx], duration: e.target.value };
                      updateField('internships', next);
                    }}
                  />
                </div>
                <Input
                  label="Impact & Description"
                  value={intern.description}
                  onChange={(e) => {
                    const next = [...formState.internships];
                    next[idx] = { ...next[idx], description: e.target.value };
                    updateField('internships', next);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* TAB 6: HACKATHONS */}
        {activeTab === 'hackathons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Hackathons &amp; Competitions
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateField('hackathons', [
                    ...formState.hackathons,
                    {
                      id: `hack-${Date.now()}`,
                      name: 'RADIX Talent Match Hackathon 2026',
                      organizer: 'RADIX & TGL',
                      year: '2026',
                      achievement: 'Finalist',
                      project_summary: 'Built end-to-end candidate readiness & skill matching platform.',
                    },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Hackathon</span>
              </Button>
            </div>

            {formState.hackathons.map((hack, idx) => (
              <div
                key={hack.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Hackathon #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'hackathons',
                        formState.hackathons.filter((_, i) => i !== idx)
                      )
                    }
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Hackathon Name"
                    value={hack.name}
                    onChange={(e) => {
                      const next = [...formState.hackathons];
                      next[idx] = { ...next[idx], name: e.target.value };
                      updateField('hackathons', next);
                    }}
                  />
                  <Input
                    label="Organizer"
                    value={hack.organizer}
                    onChange={(e) => {
                      const next = [...formState.hackathons];
                      next[idx] = { ...next[idx], organizer: e.target.value };
                      updateField('hackathons', next);
                    }}
                  />
                  <Input
                    label="Achievement / Rank"
                    value={hack.achievement}
                    onChange={(e) => {
                      const next = [...formState.hackathons];
                      next[idx] = { ...next[idx], achievement: e.target.value };
                      updateField('hackathons', next);
                    }}
                  />
                </div>
                <Input
                  label="Project Summary"
                  value={hack.project_summary}
                  onChange={(e) => {
                    const next = [...formState.hackathons];
                    next[idx] = { ...next[idx], project_summary: e.target.value };
                    updateField('hackathons', next);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* TAB 7: CERTIFICATIONS */}
        {activeTab === 'certifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Certifications &amp; Credentials
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateField('certifications', [
                    ...formState.certifications,
                    {
                      id: `cert-${Date.now()}`,
                      name: 'Cloud / Data Certification',
                      issuer: 'Provider',
                      year: '2026',
                    },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Certification</span>
              </Button>
            </div>

            {formState.certifications.map((cert, idx) => (
              <div
                key={cert.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <div className="sm:col-span-5">
                  <Input
                    label="Certification Name"
                    value={cert.name}
                    onChange={(e) => {
                      const next = [...formState.certifications];
                      next[idx] = { ...next[idx], name: e.target.value };
                      updateField('certifications', next);
                    }}
                  />
                </div>
                <div className="sm:col-span-4">
                  <Input
                    label="Issuing Organization"
                    value={cert.issuer}
                    onChange={(e) => {
                      const next = [...formState.certifications];
                      next[idx] = { ...next[idx], issuer: e.target.value };
                      updateField('certifications', next);
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Year"
                    value={cert.year}
                    onChange={(e) => {
                      const next = [...formState.certifications];
                      next[idx] = { ...next[idx], year: e.target.value };
                      updateField('certifications', next);
                    }}
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'certifications',
                        formState.certifications.filter((_, i) => i !== idx)
                      )
                    }
                    className="p-2 text-slate-400 hover:text-red-600 cursor-pointer"
                    aria-label="Remove certification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 8: PREFERRED ROLES & CV UPLOAD */}
        {activeTab === 'roles_cv' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Preferred Target Roles
              </h2>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="e.g. Software Engineer (SWE)"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!newRoleInput.trim()) return;
                    updateField('preferred_roles', [
                      ...formState.preferred_roles,
                      newRoleInput.trim(),
                    ]);
                    setNewRoleInput('');
                  }}
                >
                  Add Role
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {formState.preferred_roles.map((r, idx) => (
                  <div
                    key={`${r}-${idx}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
                  >
                    <span>{r}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          'preferred_roles',
                          formState.preferred_roles.filter((_, i) => i !== idx)
                        )
                      }
                      className="text-slate-400 hover:text-red-500 cursor-pointer"
                      aria-label={`Remove role ${r}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileUp className="w-4 h-4 text-indigo-500" />
                <span>CV Document Reference (`cv_file`)</span>
              </h3>
              <Input
                label="Active CV Filename in Shared Contract"
                value={formState.cv_file}
                onChange={(e) => updateField('cv_file', e.target.value)}
              />
              <FileUpload
                label="Upload Updated CV File to Update Reference"
                selectedFile={cvFileObj}
                onFileSelect={(file) => {
                  setCvFileObj(file);
                  if (file) {
                    updateField('cv_file', file.name);
                    toast.info(`Updated cv_file reference to ${file.name}`);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* LIVE PROFILE PREVIEW Div — Placed directly below Technical Skills & 1–10 Proficiency Levels / Editor Card */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
              LIVE PROFILE PREVIEW
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {formState.name || 'Unnamed Candidate'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formState.email || 'No email specified'}
              {formState.headline ? ` · ${formState.headline}` : ''}
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Profile Completeness
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {liveCompleteness.score}% Complete
              </span>
            </div>
            <Progress
              value={liveCompleteness.score}
              tone={liveCompleteness.score === 100 ? 'emerald' : 'indigo'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Summary Counters */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">Tagged Skills</span>
              <span className="font-mono font-bold text-base text-slate-900 dark:text-white mt-0.5 block">
                {formState.skills.length}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">Internships</span>
              <span className="font-mono font-bold text-base text-slate-900 dark:text-white mt-0.5 block">
                {formState.internships.length}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">Hackathons</span>
              <span className="font-mono font-bold text-base text-slate-900 dark:text-white mt-0.5 block">
                {formState.hackathons.length}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">Certifications</span>
              <span className="font-mono font-bold text-base text-slate-900 dark:text-white mt-0.5 block">
                {formState.certifications.length}
              </span>
            </div>
          </div>

          {/* Completeness Breakdown */}
          <div className="lg:col-span-5 space-y-2.5 text-xs">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Readiness Hand-off Checklist
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {liveCompleteness.completedSections.map((sec) => (
                <div
                  key={sec}
                  className="flex items-center gap-2 text-slate-600 dark:text-slate-400"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{sec}</span>
                </div>
              ))}
              {liveCompleteness.missingSections.map((sec) => (
                <div
                  key={sec}
                  className="flex items-center gap-2 text-amber-600 dark:text-amber-400"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Missing: {sec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="lg:col-span-3 space-y-2.5">
            <Button
              variant="primary"
              className="w-full"
              onClick={async () => {
                await handleSave();
                navigate('/app/talent-check');
              }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Save &amp; Run Talent Check →</span>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await handleSave();
                navigate('/app/skill-matching');
              }}
            >
              <GitCompare className="w-4 h-4" />
              <span>Save &amp; Run Skill Matching →</span>
            </Button>
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="w-full text-center text-[11px] text-slate-500 hover:text-red-600 pt-1 cursor-pointer"
            >
              Clear profile data
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleResetToDefaultPersona}
        title="Clear Candidate Profile?"
        message="This will clear all entered candidate details, skills, and experience from Profile Builder."
        confirmLabel="Clear Profile"
        variant="danger"
      />
    </div>
  );
};
