import React, { useState } from 'react';
import { Star, Brain, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RewardScores {
  keywordScore: number;
  bulletScore: number;
  formatScore: number;
  totalReward: number;
}

interface RewardFeedbackProps {
  feedbackId: string | null;
  scores: RewardScores | null;
  strategyName: string | null;
}

export const RewardFeedback: React.FC<RewardFeedbackProps> = ({
  feedbackId,
  scores,
  strategyName,
}) => {
  const [userRating, setUserRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submitRating = async (rating: number) => {
    if (!feedbackId) return;
    setUserRating(rating);
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('reward-model', {
        body: { action: 'submit_rating', feedbackId, rating },
      });
      if (error) throw error;
      setSubmitted(true);
      toast({
        title: 'Thanks for your feedback!',
        description: `Your rating helps the AI improve. New reward: ${((data.newReward ?? 0) * 100).toFixed(0)}%`,
      });
    } catch (err: any) {
      toast({ title: 'Failed to submit rating', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!scores) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">AI Reward Model</span>
        {strategyName && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Strategy: {strategyName.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Scores */}
      <div className="px-4 py-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <ScoreBar label="Keyword Coverage" value={scores.keywordScore} icon="🎯" />
          <ScoreBar label="Bullet Quality" value={scores.bulletScore} icon="✍️" />
          <ScoreBar label="Format Compliance" value={scores.formatScore} icon="📋" />
          <ScoreBar label="Total Reward" value={scores.totalReward} icon="⚡" highlight />
        </div>
      </div>

      {/* Star Rating */}
      <div className="px-4 py-3 border-t border-border">
        {submitted ? (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              Feedback recorded! The AI will use this to improve future generations.
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Rate this resume to help the AI learn:</span>
            <div className="flex items-center gap-1">
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground mr-1" />}
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => submitRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  disabled={isSubmitting}
                  className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
                >
                  <Star
                    className={`w-5 h-5 transition-colors ${
                      star <= (hoveredStar || userRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ScoreBar: React.FC<{ label: string; value: number; icon: string; highlight?: boolean }> = ({
  label, value, icon, highlight
}) => {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? 'hsl(158 64% 48%)' : pct >= 50 ? 'hsl(46 100% 58%)' : 'hsl(0 84% 60%)';

  return (
    <div className={`p-2 rounded-lg ${highlight ? 'bg-primary/5 border border-primary/15' : 'bg-muted/50'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{icon} {label}</span>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
};
