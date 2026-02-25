import React, { useEffect, useState } from 'react';
import { Brain, TrendingUp, BarChart3, Target, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Strategy {
  id: string;
  name: string;
  description: string;
  avg_reward: number;
  times_selected: number;
  ucb_score: number;
}

interface RLStats {
  strategies: Strategy[];
  totalGenerations: number;
  avgReward: number;
  cumulativeRegret: number;
  convergenceMetric: number;
}

export const RLDashboard: React.FC = () => {
  const [stats, setStats] = useState<RLStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reward-model', {
        body: { action: 'get_stats' },
      });
      if (!error && data) setStats(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) fetchStats();
  }, [expanded]);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-up" style={{ animationDelay: '0.3s' }}>
      {/* Toggle Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold font-display text-foreground text-sm">RL Optimization Dashboard</h3>
            <p className="text-xs text-muted-foreground">
              Multi-Armed Bandit with UCB1 • Self-improving resume generation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {stats.totalGenerations} generations
            </span>
          )}
          <span className={`text-xs text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-5 space-y-4 border-t border-border pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : stats ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard icon={<Zap className="w-4 h-4" />} label="Total Generations" value={stats.totalGenerations.toString()} />
                <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Avg Reward" value={`${(stats.avgReward * 100).toFixed(1)}%`} />
                <MetricCard icon={<Target className="w-4 h-4" />} label="Convergence" value={`${(stats.convergenceMetric * 100).toFixed(1)}%`} />
                <MetricCard icon={<BarChart3 className="w-4 h-4" />} label="Cum. Regret" value={stats.cumulativeRegret.toFixed(2)} />
              </div>

              {/* Strategy Table */}
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Strategy Arms (UCB1 Multi-Armed Bandit)
                </h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Strategy</th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium">Pulls</th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium">Avg Reward</th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium">UCB Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.strategies.map((s, i) => (
                        <tr key={s.id} className={`border-b border-border last:border-0 ${i === 0 ? 'bg-primary/5' : ''}`}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-foreground">{s.name.replace(/_/g, ' ')}</div>
                            <div className="text-muted-foreground truncate max-w-[200px]">{s.description}</div>
                          </td>
                          <td className="text-right px-3 py-2 font-mono text-foreground">{s.times_selected}</td>
                          <td className="text-right px-3 py-2">
                            <RewardBadge value={s.avg_reward} />
                          </td>
                          <td className="text-right px-3 py-2 font-mono text-muted-foreground">
                            {s.ucb_score === 999 ? '∞' : s.ucb_score.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Math Explanation */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground">📐 How the RL System Works:</p>
                <p><span className="font-mono text-primary">UCB1(i) = X̄ᵢ + √2 × √(ln(N)/nᵢ)</span> — Balances exploitation (high avg reward) with exploration (less-tested strategies)</p>
                <p><span className="font-mono text-primary">R(resume) = 0.35·S_kw + 0.25·S_bullet + 0.15·S_fmt + 0.25·S_user</span> — Multi-dimensional reward function</p>
                <p>Each generation, UCB1 selects the strategy with the highest upper confidence bound. As more data arrives, the exploration term shrinks (√(ln N / nᵢ) → 0), converging to the best-performing strategy.</p>
              </div>

              <button
                onClick={fetchStats}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh stats
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Generate some resumes to see optimization data
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="p-3 rounded-xl bg-muted/50 border border-border">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">{icon}<span className="text-xs">{label}</span></div>
    <div className="text-lg font-bold font-display text-foreground">{value}</div>
  </div>
);

const RewardBadge: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`font-mono font-bold ${color}`}>{pct}%</span>;
};
