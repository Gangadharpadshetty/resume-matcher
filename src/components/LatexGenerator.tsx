import React, { useState } from 'react';
import { Download, Code2, Loader2, Wand2, Copy, Check, FileDown, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ATSResult } from '@/lib/atsParser';

interface LatexGeneratorProps {
  resumeText: string;
  jobDescription: string;
  atsResult: ATSResult;
}

export const LatexGenerator: React.FC<LatexGeneratorProps> = ({
  resumeText,
  jobDescription,
  atsResult,
}) => {
  const [latexCode, setLatexCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateLatex = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      toast({ title: 'Missing input', description: 'Please provide both resume and job description first.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setLatexCode('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-resume', {
        body: {
          resumeText,
          jobDescription,
          missingKeywords: atsResult.missingKeywords,
          matchedKeywords: atsResult.matchedKeywords,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      setLatexCode(data.latexCode || '');
      toast({ title: 'Resume generated!', description: 'Your ATS-optimized LaTeX resume is ready to download.' });
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
    a.download = 'optimized-resume.tex';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded!', description: 'optimized-resume.tex saved to your device.' });
  };

  const downloadPDF = () => {
    // Encode LaTeX for latexonline.cc
    const encoded = encodeURIComponent(latexCode);
    // Use overleaf to compile - most reliable free option
    const overleafUrl = `https://www.overleaf.com/docs?snip_uri=data:application/x-tex,${encoded}`;
    window.open(overleafUrl, '_blank');
    toast({ title: 'Opening Overleaf', description: 'Compile your LaTeX resume to PDF in Overleaf.' });
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(latexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!', description: 'LaTeX code copied to clipboard.' });
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-up" style={{ animationDelay: '0.2s' }}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Wand2 className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold font-display text-foreground">AI Resume Optimizer</h3>
            <p className="text-xs text-muted-foreground">Generates ATS-optimized LaTeX resume with missing keywords</p>
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
                Generating optimized resume...
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors border border-border"
            >
              <ExternalLink className="w-4 h-4" />
              Compile PDF via Overleaf
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors border border-border"
            >
              {copied ? <Check className="w-4 h-4 text-score-excellent" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={() => setLatexCode('')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              Regenerate
            </button>
          </div>

          {/* Code Preview */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b border-border">
              <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">optimized-resume.tex</span>
              <span className="ml-auto text-xs text-muted-foreground">{latexCode.split('\n').length} lines</span>
            </div>
            <pre className="px-4 py-4 text-xs text-foreground overflow-auto max-h-80 bg-muted/30 leading-relaxed font-mono">
              {latexCode}
            </pre>
          </div>

          {/* Overleaf hint */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <Download className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">To get a PDF:</span> Download the .tex file then compile it using{' '}
              <button onClick={downloadPDF} className="text-primary underline underline-offset-2 hover:opacity-80">Overleaf</button>
              {' '}(free, no install needed) or a local LaTeX editor like VS Code + LaTeX Workshop.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
