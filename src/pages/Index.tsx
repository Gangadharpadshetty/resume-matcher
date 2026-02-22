import React, { useState, useCallback } from 'react';
import { Zap, FileText, Briefcase, BarChart3, Github, Sparkles, Link, Loader2 } from 'lucide-react';
import { ResumeUpload } from '@/components/ResumeUpload';
import { ScoreRing } from '@/components/ScoreRing';
import { KeywordAnalysis } from '@/components/KeywordAnalysis';
import { LatexGenerator } from '@/components/LatexGenerator';
import { analyzeResume, type ATSResult } from '@/lib/atsParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const [resumeText, setResumeText] = useState(() => localStorage.getItem('resumeText') || '');
  const [resumeFileName, setResumeFileName] = useState<string | undefined>(() => localStorage.getItem('resumeFileName') || undefined);
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isFetchingJob, setIsFetchingJob] = useState(false);
  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleResumeChange = useCallback((text: string, fileName?: string) => {
    setResumeText(text);
    localStorage.setItem('resumeText', text);
    if (fileName !== undefined) {
      setResumeFileName(fileName);
      if (fileName) localStorage.setItem('resumeFileName', fileName);
      else localStorage.removeItem('resumeFileName');
    }
    setAtsResult(null);
  }, []);

  const handleAnalyze = () => {
    if (!resumeText.trim() || !jobDescription.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = analyzeResume(resumeText, jobDescription);
      setAtsResult(result);
      setIsAnalyzing(false);
    }, 600);
  };

  const canAnalyze = resumeText.trim().length > 50 && jobDescription.trim().length > 50;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-background/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold font-display tracking-tight text-foreground">
                Resume<span className="text-primary">Match</span>
              </h1>
              <p className="text-xs text-muted-foreground leading-none">ATS Score Parser</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">AI-Powered</span>
            </div>
            <a
              href="https://github.com/Gangadharpadshetty/resume-matcher"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Source</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Instant ATS Analysis + AI Resume Generation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground leading-tight">
            Beat the ATS,<br />
            <span className="text-primary">land the interview</span>
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Upload your resume, paste the job description, and get your ATS match score instantly.
            Then let AI rewrite your resume in LaTeX with all missing keywords included.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Inputs */}
          <div className="space-y-5">
            {/* Resume Input */}
            <div className="rounded-2xl border border-border bg-card p-5 animate-fade-up">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold font-display">Your Resume</h3>
                  <p className="text-xs text-muted-foreground">Upload PDF or paste text</p>
                </div>
              </div>
              <ResumeUpload
                onTextExtracted={handleResumeChange}
                resumeText={resumeText}
                fileName={resumeFileName}
              />
            </div>

            {/* Job Description Input */}
            <div className="rounded-2xl border border-border bg-card p-5 animate-fade-up" style={{ animationDelay: '0.05s' }}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold font-display">Job Description</h3>
                  <p className="text-xs text-muted-foreground">Paste a link or the full job posting</p>
                </div>
              </div>

              {/* URL Input */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="url"
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                    placeholder="Paste job posting URL (LinkedIn, Indeed, etc.)"
                    className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!jobUrl.trim()) return;
                    setIsFetchingJob(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('fetch-job-description', {
                        body: { url: jobUrl.trim() },
                      });
                      if (error) throw error;
                      if (!data.success) throw new Error(data.error);
                      setJobDescription(data.text);
                      setAtsResult(null);
                      toast.success('Job description fetched successfully');
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to fetch job description');
                    } finally {
                      setIsFetchingJob(false);
                    }
                  }}
                  disabled={!jobUrl.trim() || isFetchingJob}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
                >
                  {isFetchingJob ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
                  Fetch
                </button>
              </div>

              <textarea
                value={jobDescription}
                onChange={e => { setJobDescription(e.target.value); setAtsResult(null); }}
                placeholder="Or paste the job description text here — include requirements, responsibilities, qualifications..."
                className="w-full h-44 px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {jobDescription.split(/\s+/).filter(Boolean).length} words
                </span>
                {jobDescription && (
                  <button
                    onClick={() => { setJobDescription(''); setJobUrl(''); setAtsResult(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || isAnalyzing}
              className="w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed animate-fade-up"
              style={{
                animationDelay: '0.1s',
                background: canAnalyze && !isAnalyzing
                  ? 'linear-gradient(135deg, hsl(158 64% 48%), hsl(158 64% 38%))'
                  : 'hsl(222 20% 16%)',
                color: canAnalyze && !isAnalyzing ? 'hsl(158 100% 5%)' : 'hsl(215 15% 45%)',
                boxShadow: canAnalyze && !isAnalyzing ? '0 8px 32px hsl(158 64% 48% / 0.3)' : 'none',
              }}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  Analyze ATS Match Score
                </>
              )}
            </button>
          </div>

          {/* Right: Results */}
          <div className="space-y-5">
            {!atsResult && !isAnalyzing && (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center py-20 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <BarChart3 className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Results will appear here</p>
                <p className="text-xs text-muted-foreground mt-1 text-center max-w-48">
                  Fill in your resume and job description, then click Analyze
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Parsing keywords & calculating score...</p>
              </div>
            )}

            {atsResult && !isAnalyzing && (
              <div className="space-y-5">
                {/* Score Card */}
                <div className="rounded-2xl border border-border bg-card p-6 animate-fade-up">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ScoreRing score={atsResult.score} size={160} />
                    <div className="flex-1 space-y-3 text-center sm:text-left">
                      <div>
                        <h3 className="font-bold font-display text-xl text-foreground">
                          {atsResult.score}% Match
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {atsResult.matchedKeywords.length} of {atsResult.totalJDKeywords} keywords matched
                        </p>
                      </div>
                      {/* Mini progress bars */}
                      <div className="space-y-2">
                        <ProgressBar label="Keywords" value={atsResult.matchedKeywords.length} total={atsResult.totalJDKeywords} color="hsl(158 64% 48%)" />
                        <ProgressBar label="Skills" value={atsResult.breakdown.skills.matched.length} total={atsResult.breakdown.skills.matched.length + atsResult.breakdown.skills.missing.length} color="hsl(46 100% 58%)" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Keyword Analysis */}
                <KeywordAnalysis result={atsResult} />
              </div>
            )}
          </div>
        </div>

        {/* AI LaTeX Generator - full width, shown after analysis */}
        {atsResult && (
          <div className="mt-6">
            <LatexGenerator
              resumeText={resumeText}
              jobDescription={jobDescription}
              atsResult={atsResult}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            ResumeMatch — ATS Score Parser & AI Resume Optimizer
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by Lovable AI • LaTeX compilation via Overleaf
          </p>
        </div>
      </footer>
    </div>
  );
};

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
};

export default Index;
