
-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Prompt strategies table: each row is a "policy" (RL arm) the system can select
CREATE TABLE public.prompt_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  strategy_config JSONB NOT NULL DEFAULT '{}',
  total_rewards DOUBLE PRECISION NOT NULL DEFAULT 0,
  times_selected INTEGER NOT NULL DEFAULT 0,
  avg_reward DOUBLE PRECISION NOT NULL DEFAULT 0,
  ucb_score DOUBLE PRECISION NOT NULL DEFAULT 999,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Resume feedback table: stores reward signals per generation
CREATE TABLE public.resume_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  strategy_id UUID REFERENCES public.prompt_strategies(id),
  keyword_coverage_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  bullet_quality_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  format_compliance_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  compilation_success BOOLEAN NOT NULL DEFAULT false,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  total_reward DOUBLE PRECISION NOT NULL DEFAULT 0,
  matched_keywords INTEGER NOT NULL DEFAULT 0,
  total_keywords INTEGER NOT NULL DEFAULT 0,
  latex_line_count INTEGER NOT NULL DEFAULT 0,
  generation_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RL optimization log
CREATE TABLE public.rl_optimization_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  epoch INTEGER NOT NULL,
  total_generations INTEGER NOT NULL DEFAULT 0,
  avg_reward DOUBLE PRECISION NOT NULL DEFAULT 0,
  best_strategy_id UUID REFERENCES public.prompt_strategies(id),
  exploration_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rl_optimization_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strategies are publicly readable" ON public.prompt_strategies FOR SELECT USING (true);
CREATE POLICY "Feedback is publicly readable" ON public.resume_feedback FOR SELECT USING (true);
CREATE POLICY "Anyone can submit feedback" ON public.resume_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update feedback" ON public.resume_feedback FOR UPDATE USING (true);
CREATE POLICY "RL log is publicly readable" ON public.rl_optimization_log FOR SELECT USING (true);
CREATE POLICY "System can insert RL log" ON public.rl_optimization_log FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update strategies" ON public.prompt_strategies FOR UPDATE USING (true);
CREATE POLICY "System can insert strategies" ON public.prompt_strategies FOR INSERT WITH CHECK (true);

-- Seed initial prompt strategies (the "arms" of our multi-armed bandit)
INSERT INTO public.prompt_strategies (name, description, strategy_config) VALUES
('aggressive_keywords', 'Maximizes keyword density', '{"keyword_weight": 0.9, "naturalness_weight": 0.1, "instruction": "You MUST integrate EVERY single missing keyword. Keyword coverage is the #1 priority."}'),
('balanced_natural', 'Balanced keyword + readability', '{"keyword_weight": 0.5, "naturalness_weight": 0.5, "instruction": "Integrate missing keywords naturally where they fit. Quality over quantity."}'),
('metrics_heavy', 'Quantified achievements focus', '{"keyword_weight": 0.4, "metrics_weight": 0.3, "instruction": "Every bullet MUST contain a specific metric (%, ms, RPS). Quantify everything."}'),
('senior_framing', 'Senior-level system design emphasis', '{"keyword_weight": 0.4, "seniority_weight": 0.4, "instruction": "Frame every experience as owning the project end-to-end. Emphasize architecture and leadership."}'),
('concise_impact', 'Ultra-concise 1-line bullets', '{"keyword_weight": 0.4, "brevity_weight": 0.4, "instruction": "Keep every bullet to exactly 1 line. Format: [Verb] [what] using [tech], [result with metric]."}');

-- Trigger for updated_at
CREATE TRIGGER update_prompt_strategies_updated_at
BEFORE UPDATE ON public.prompt_strategies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
