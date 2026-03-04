
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Project',
  resume_text text,
  resume_file_name text,
  job_description text,
  job_url text,
  latex_code text,
  ats_score integer,
  matched_keywords text[] DEFAULT '{}'::text[],
  missing_keywords text[] DEFAULT '{}'::text[],
  strategy_name text,
  reward_scores jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage projects by session" ON public.projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
