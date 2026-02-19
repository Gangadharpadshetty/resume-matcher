import React, { useState } from 'react';
import { CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, Lightbulb, Award } from 'lucide-react';
import type { ATSResult } from '@/lib/atsParser';

interface KeywordAnalysisProps {
  result: ATSResult;
}

export const KeywordAnalysis: React.FC<KeywordAnalysisProps> = ({ result }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ keywords: true });

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const statItems = [
    {
      label: 'Matched',
      value: result.matchedKeywords.length,
      total: result.totalJDKeywords,
      color: 'text-score-excellent',
      bg: 'bg-score-excellent/10 border-score-excellent/20',
    },
    {
      label: 'Partial',
      value: result.partialMatches.length,
      total: result.totalJDKeywords,
      color: 'text-score-good',
      bg: 'bg-score-good/10 border-score-good/20',
    },
    {
      label: 'Missing',
      value: result.missingKeywords.length,
      total: result.totalJDKeywords,
      color: 'text-score-poor',
      bg: 'bg-score-poor/10 border-score-poor/20',
    },
  ];

  return (
    <div className="space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {statItems.map(item => (
          <div key={item.label} className={`p-3 rounded-xl border ${item.bg} text-center`}>
            <div className={`text-2xl font-bold font-display ${item.color}`}>{item.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Keyword Chips Section */}
      <Section
        title="Keyword Analysis"
        isOpen={expanded.keywords}
        onToggle={() => toggle('keywords')}
      >
        {result.matchedKeywords.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-score-excellent" />
              <span className="text-xs font-medium text-score-excellent">Matched ({result.matchedKeywords.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.matchedKeywords.slice(0, 25).map(kw => (
                <span key={kw} className="chip-match">{kw}</span>
              ))}
              {result.matchedKeywords.length > 25 && (
                <span className="chip-match">+{result.matchedKeywords.length - 25} more</span>
              )}
            </div>
          </div>
        )}

        {result.partialMatches.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <MinusCircle className="w-3.5 h-3.5 text-score-good" />
              <span className="text-xs font-medium text-score-good">Partial Match ({result.partialMatches.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.partialMatches.slice(0, 15).map(kw => (
                <span key={kw} className="chip-partial">{kw}</span>
              ))}
            </div>
          </div>
        )}

        {result.missingKeywords.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <XCircle className="w-3.5 h-3.5 text-score-poor" />
              <span className="text-xs font-medium text-score-poor">Missing ({result.missingKeywords.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.missingKeywords.slice(0, 25).map(kw => (
                <span key={kw} className="chip-missing">{kw}</span>
              ))}
              {result.missingKeywords.length > 25 && (
                <span className="chip-missing">+{result.missingKeywords.length - 25} more</span>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* Skills Breakdown */}
      {result.breakdown.skills.matched.length + result.breakdown.skills.missing.length > 0 && (
        <Section
          title="Technical Skills"
          isOpen={expanded.skills}
          onToggle={() => toggle('skills')}
          icon={<Award className="w-4 h-4 text-primary" />}
        >
          {result.breakdown.skills.matched.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">✓ Skills you have</p>
              <div className="flex flex-wrap gap-1.5">
                {result.breakdown.skills.matched.map(s => (
                  <span key={s} className="chip-match">{s}</span>
                ))}
              </div>
            </div>
          )}
          {result.breakdown.skills.missing.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">✗ Skills to add / learn</p>
              <div className="flex flex-wrap gap-1.5">
                {result.breakdown.skills.missing.map(s => (
                  <span key={s} className="chip-missing">{s}</span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <Section
          title="Improvement Tips"
          isOpen={expanded.suggestions ?? true}
          onToggle={() => toggle('suggestions')}
          icon={<Lightbulb className="w-4 h-4 text-score-good" />}
        >
          <ul className="space-y-2">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
};

interface SectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, isOpen, onToggle, children, icon }) => (
  <div className="rounded-xl border border-border overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold font-display">{title}</span>
      </div>
      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
    </button>
    {isOpen && (
      <div className="px-4 py-4 bg-card border-t border-border space-y-2">
        {children}
      </div>
    )}
  </div>
);
