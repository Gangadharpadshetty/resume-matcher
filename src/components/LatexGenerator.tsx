import React, { useState } from 'react';
import { Download, Code2, Loader2, Wand2, Copy, Check, FileDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RewardFeedback } from '@/components/RewardFeedback';
import type { ATSResult } from '@/lib/atsParser';

interface LatexGeneratorProps {
  resumeText: string;
  jobDescription: string;
  atsResult: ATSResult;
}

interface RewardScores {
  keywordScore: number;
  bulletScore: number;
  formatScore: number;
  totalReward: number;
}

// Sanitize company name for use in filenames
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .trim()
    .slice(0, 40);
}

export const LatexGenerator: React.FC<LatexGeneratorProps> = ({
  resumeText,
  jobDescription,
  atsResult,
}) => {
  const [latexCode, setLatexCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [rewardScores, setRewardScores] = useState<RewardScores | null>(null);
  const [strategyName, setStrategyName] = useState<string | null>(null);
  const { toast } = useToast();

  // Build filename from company name
  const companyName = atsResult.companyName;
  const getFileName = (ext: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (companyName) {
      return `Resume_${sanitizeFileName(companyName)}_${today}.${ext}`;
    }
    return `Resume_Optimized_${today}.${ext}`;
  };

  const generateLatex = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      toast({ title: 'Missing input', description: 'Please provide both resume and job description first.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setLatexCode('');
    setFeedbackId(null);
    setRewardScores(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-resume', {
        body: {
          resumeText,
          jobDescription,
          missingKeywords: atsResult.missingKeywords.slice(0, 30),
          matchedKeywords: atsResult.matchedKeywords.slice(0, 20),
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      const generatedCode = data.latexCode || '';
      setLatexCode(generatedCode);
      setStrategyName(data.strategyName || null);

      toast({
        title: 'Resume generated!',
        description: `Strategy: ${(data.strategyName || 'default').replace(/_/g, ' ')} • ${data.generationTimeMs || 0}ms`,
      });

      // Compute reward scores via the reward model
      try {
        const { data: rewardData } = await supabase.functions.invoke('reward-model', {
          body: {
            action: 'compute_reward',
            latexCode: generatedCode,
            matchedKeywords: atsResult.matchedKeywords,
            missingKeywords: atsResult.missingKeywords,
            compilationSuccess: true,
            sessionId: crypto.randomUUID(),
            strategyId: data.strategyId,
          },
        });
        if (rewardData?.scores) {
          setRewardScores(rewardData.scores);
          setFeedbackId(rewardData.feedbackId);
        }
      } catch {
        // Non-critical: reward computation failed
      }
    } catch (err: any) {
      toast({
        title: 'Generation failed',
        description: err?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadLatex = () => {
    const blob = new Blob([latexCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFileName('tex');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded!', description: `${getFileName('tex')} saved to your device.` });
  };

  const downloadPDF = async () => {
    setIsCompiling(true);
    try {
      const { data, error } = await supabase.functions.invoke('compile-latex', {
        body: { latexCode },
      });

      if (error) throw error;

      let blob: Blob;
      if (data instanceof Blob) {
        blob = data;
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([data], { type: 'application/pdf' });
      } else {
        if (data?.error) throw new Error(data.error);
        throw new Error('Unexpected response format from compiler');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName('pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'PDF Downloaded!', description: `${getFileName('pdf')} has been saved.` });
    } catch (err: any) {
      toast({
        title: 'PDF compilation failed',
        description: err?.message || 'Could not compile LaTeX to PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(latexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!', description: 'LaTeX code copied to clipboard.' });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-up" style={{ animationDelay: '0.2s' }}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Wand2 className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold font-display text-foreground">AI Resume Optimizer</h3>
              <p className="text-xs text-muted-foreground">
                RL-powered • UCB1 strategy • STAR method
                {companyName && <> • Targeting <span className="text-primary font-medium">{companyName}</span></>}
              </p>
            </div>
          </div>
          {latexCode && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">Ready</span>
            </div>
          )}
        </div>

        {/* Missing keywords preview */}
        {atsResult.missingKeywords.length > 0 && !latexCode && (
          <div className="px-6 py-4 bg-muted/30 border-b border-border">
            <p className="text-xs text-muted-foreground mb-2">
              <span className="font-medium text-foreground">{atsResult.missingKeywords.length} missing keywords</span> will be woven into your optimized resume:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {atsResult.missingKeywords.slice(0, 12).map(kw => (
                <span key={kw} className="chip-missing text-xs">{kw}</span>
              ))}
              {atsResult.missingKeywords.length > 12 && (
                <span className="chip-missing text-xs">+{atsResult.missingKeywords.length - 12} more</span>
              )}
            </div>
          </div>
        )}

        {/* Generate button */}
        {!latexCode && (
          <div className="px-6 py-6">
            <button
              onClick={generateLatex}
              disabled={isGenerating || !resumeText.trim() || !jobDescription.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isGenerating
                  ? 'hsl(222 20% 16%)'
                  : 'linear-gradient(135deg, hsl(158 64% 48%), hsl(158 64% 38%))',
                color: isGenerating ? 'hsl(215 15% 55%)' : 'hsl(158 100% 5%)',
                boxShadow: isGenerating ? 'none' : '0 4px 20px hsl(158 64% 48% / 0.3)',
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating with STAR method + RL strategy...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate ATS-Optimized Resume
                </>
              )}
            </button>
            {(!resumeText.trim() || !jobDescription.trim()) && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                Complete both resume and job description inputs above
              </p>
            )}
          </div>
        )}

        {/* LaTeX Output */}
        {latexCode && (
          <div className="px-6 py-4 space-y-4">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadLatex}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, hsl(158 64% 48%), hsl(158 64% 38%))',
                  color: 'hsl(158 100% 5%)',
                  boxShadow: '0 4px 16px hsl(158 64% 48% / 0.25)',
                }}
              >
                <FileDown className="w-4 h-4" />
                Download .tex
              </button>
              <button
                onClick={downloadPDF}
                disabled={isCompiling}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors border border-border disabled:opacity-50"
              >
                {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {isCompiling ? 'Compiling PDF...' : 'Download PDF'}
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors border border-border"
              >
                {copied ? <Check className="w-4 h-4 text-score-excellent" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={() => { setLatexCode(''); setFeedbackId(null); setRewardScores(null); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
              >
                Regenerate
              </button>
            </div>

            {/* Code Preview */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b border-border">
                <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{getFileName('tex')}</span>
                <span className="ml-auto text-xs text-muted-foreground">{latexCode.split('\n').length} lines</span>
              </div>
              <pre className="px-4 py-4 text-xs text-foreground overflow-auto max-h-80 bg-muted/30 leading-relaxed font-mono">
                {latexCode}
              </pre>
            </div>

            {/* Hint */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
              <Download className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Download PDF</span> compiles your LaTeX resume to PDF directly. You can also download the .tex file for manual editing.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Reward Feedback Panel — shown after generation */}
      {latexCode && (
        <RewardFeedback
          feedbackId={feedbackId}
          scores={rewardScores}
          strategyName={strategyName}
        />
      )}
    </div>
  );
};
