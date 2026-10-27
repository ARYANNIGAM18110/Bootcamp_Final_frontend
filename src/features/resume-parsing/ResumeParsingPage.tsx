import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  UserCheck,
  GraduationCap,
  Briefcase,
  Award,
  Code2,
  FolderGit2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader,
  Button,
  FileUpload,
  Progress,
  Skeleton,
  ErrorState,
} from '../../components/ui/primitives';
import { useWorkspace } from '../../context/WorkspaceContext';
import { resumeParsingService } from '../../services/mock';
import { SAMPLE_PARSED_RESUMES } from '../../data/mockDataset';
import { ParsedResumeOutput } from '../../types/radix';
import { CATEGORY_LOOKUP } from '../../data/radixCategories';

export const ResumeParsingPage: React.FC = () => {
  const {
    activeCandidateId,
    latestParsedResume,
    setLatestParsedResume,
    importParsedResumeToProfile,
    activeResumeSession,
    updateActiveResumeSession,
  } = useWorkspace();
  const navigate = useNavigate();

  // Reconstruct selected File from session state when returning to this page
  const [uploadedFile, setUploadedFile] = useState<File | null>(() => {
    if (activeResumeSession.selectedFileName) {
      return new File([''], activeResumeSession.selectedFileName, {
        type: activeResumeSession.selectedFileName.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf',
      });
    }
    return null;
  });

  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const hasParsed = activeResumeSession.hasParsed;
  const displayedResume: ParsedResumeOutput =
    activeResumeSession.displayedResume ||
    latestParsedResume ||
    SAMPLE_PARSED_RESUMES.find((r) => r.id === activeCandidateId) ||
    SAMPLE_PARSED_RESUMES[0];

  const handleParseResume = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a candidate resume (.pdf or .docx) to parse.');
      return;
    }

    setErrorMsg(null);
    setIsParsing(true);
    setProgress(30);

    const t1 = setTimeout(() => setProgress(70), 220);

    try {
      const parsed = await resumeParsingService.parseResume({
        file: uploadedFile,
      });
      setProgress(100);
      setLatestParsedResume(parsed);
      updateActiveResumeSession({
        hasParsed: true,
        displayedResume: parsed,
        selectedFileName: uploadedFile.name,
        selectedFileSize: uploadedFile.size,
      });
      toast.success(
        `Extracted ${parsed.skills.length} skills & experience for ${parsed.candidate_name}`
      );
    } catch {
      setErrorMsg('Unable to parse resume. Please try again.');
    } finally {
      clearTimeout(t1);
      setIsParsing(false);
    }
  };

  const handleImportToProfileBuilder = async () => {
    setIsImporting(true);
    try {
      await importParsedResumeToProfile(displayedResume);
      toast.success(
        `Imported ${displayedResume.candidate_name}'s extracted resume into Profile Builder.`
      );
      navigate('/app/profile');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="MODULE 02 · ROLE 2 (RESUME PARSING)"
        title="Resume Skill & Experience Extraction"
        description="Upload a candidate resume in PDF or Word (.docx) format to extract structured technical skills, education, projects, and internships."
        actions={
          hasParsed ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleImportToProfileBuilder}
              isLoading={isImporting}
            >
              <UserCheck className="w-4 h-4" />
              <span>Import into Profile Builder →</span>
            </Button>
          ) : undefined
        }
      />

      {errorMsg && <ErrorState message={errorMsg} onRetry={handleParseResume} />}

      {/* 1. Choose Sample Candidate Resume or Upload File Div */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            1. Choose Sample Candidate Resume or Upload File
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Browse or drag and drop a resume document (.pdf or .docx) and click Parse Resume to extract skills and experience.
          </p>
        </div>

        <FileUpload
          label="Upload Candidate Resume (.pdf or .docx)"
          selectedFile={uploadedFile}
          onFileSelect={(file) => {
            setUploadedFile(file);
            if (!file) {
              updateActiveResumeSession({
                hasParsed: false,
                selectedFileName: null,
                selectedFileSize: null,
              });
            } else {
              updateActiveResumeSession({
                hasParsed: false,
                selectedFileName: file.name,
                selectedFileSize: file.size,
              });
              toast.info(`Selected ${file.name} for resume parsing.`);
            }
          }}
        />

        {uploadedFile && (
          <div className="px-3 py-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {hasParsed ? 'Active parsed resume:' : 'Ready to parse:'}{' '}
              <strong>{uploadedFile.name}</strong>
            </span>
          </div>
        )}

        {isParsing && (
          <div className="p-3.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50">
            <Progress
              value={progress}
              label="Extracting technical skills, projects & education..."
              showValue
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <Button
            variant="primary"
            className="w-full sm:flex-1"
            onClick={handleParseResume}
            isLoading={isParsing}
          >
            <FileText className="w-4 h-4" />
            <span>Parse Resume</span>
          </Button>
          {hasParsed && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleImportToProfileBuilder}
              isLoading={isImporting}
            >
              <span>Import to Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Show everything below the upload division after Parse Resume is clicked (persisted across session) */}
      {(isParsing || hasParsed) && (
        <div className="space-y-6">
          {isParsing ? (
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              {/* Candidate Header Card */}
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 dark:text-indigo-400">
                      <span>{displayedResume.source_file}</span>
                      <span>·</span>
                      <span>{displayedResume.profile_archetype}</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {displayedResume.candidate_name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {displayedResume.candidate_email} · {displayedResume.phone} ·{' '}
                      {displayedResume.location}
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-2xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                      {displayedResume.skills.length}
                    </span>
                    <p className="text-[11px] text-slate-500">Skills Extracted</p>
                  </div>
                </div>

                {displayedResume.fit_summary && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Brief Profile Note:
                    </span>{' '}
                    {displayedResume.fit_summary}
                  </p>
                )}
              </div>

              {/* Extracted Technical Skills Grouped by RADIX Category */}
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-500" />
                    <span>Extracted Technical Skills (12 RADIX Categories)</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    Shared `Skill[]` Format
                  </span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {displayedResume.skills.map((skill, idx) => {
                    const cat = CATEGORY_LOOKUP[skill.category_code];
                    return (
                      <div
                        key={`${skill.category_code}-${idx}`}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {skill.category_code}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {skill.skill_name}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500">{cat?.shortName}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400">
                            {skill.evidence}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 font-mono">
                          {typeof skill.proficiency_level === 'number' && (
                            <span className="text-slate-600 dark:text-slate-300">
                              Lvl {skill.proficiency_level}/10
                            </span>
                          )}
                          <span
                            className={
                              skill.confidence === 'high'
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : skill.confidence === 'medium'
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }
                          >
                            {skill.confidence.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Extracted Education, Projects, Internships & Certifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    <span>Education</span>
                  </h3>
                  {displayedResume.education.map((edu) => (
                    <div key={edu.id} className="text-xs space-y-0.5">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {edu.degree} in {edu.field_of_study}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">{edu.institution}</p>
                      <p className="font-mono text-[11px] text-slate-500">
                        Class of {edu.graduation_year} · {edu.score_or_gpa}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    <span>Experience &amp; Internships</span>
                  </h3>
                  {displayedResume.internships.map((intern) => (
                    <div key={intern.id} className="text-xs space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {intern.role} · {intern.company}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500">{intern.duration}</p>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {intern.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-indigo-500" />
                    <span>Extracted Projects</span>
                  </h3>
                  <div className="space-y-3">
                    {displayedResume.projects.map((proj) => (
                      <div key={proj.id} className="text-xs space-y-1">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {proj.title}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {proj.description}
                        </p>
                        <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                          {proj.technologies.join(' · ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-500" />
                    <span>Certifications &amp; Hackathons</span>
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {displayedResume.certifications.map((cert) => (
                      <div key={cert.id}>
                        <p className="font-semibold text-slate-900 dark:text-white">{cert.name}</p>
                        <p className="text-slate-500">
                          {cert.issuer} · {cert.year}
                        </p>
                      </div>
                    ))}
                    {displayedResume.hackathons.map((h) => (
                      <div key={h.id} className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {h.name} ({h.achievement})
                        </p>
                        <p className="text-slate-500">{h.project_summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
