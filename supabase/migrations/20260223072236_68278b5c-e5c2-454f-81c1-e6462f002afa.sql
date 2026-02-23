
-- Jobs table for scraped fresher positions
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description TEXT,
  skills TEXT[] DEFAULT '{}',
  platform TEXT NOT NULL CHECK (platform IN ('greenhouse', 'lever', 'workday')),
  experience_level TEXT DEFAULT 'entry',
  apply_url TEXT NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  external_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(external_id, platform)
);

-- Enable RLS but allow public read (job listings are public)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jobs are publicly readable"
  ON public.jobs FOR SELECT
  USING (true);

-- Saved jobs table (requires auth later, but for now allow all)
CREATE TABLE public.saved_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, session_id)
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can save jobs"
  ON public.saved_jobs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_jobs_platform ON public.jobs(platform);
CREATE INDEX idx_jobs_is_active ON public.jobs(is_active);
CREATE INDEX idx_jobs_posted_at ON public.jobs(posted_at DESC);
CREATE INDEX idx_jobs_skills ON public.jobs USING GIN(skills);
CREATE INDEX idx_jobs_title_search ON public.jobs USING GIN(to_tsvector('english', title));
