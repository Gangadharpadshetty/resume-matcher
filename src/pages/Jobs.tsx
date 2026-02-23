import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Briefcase, MapPin, Search, BookmarkPlus, BookmarkCheck, ExternalLink, Loader2, RefreshCw, SlidersHorizontal, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  skills: string[];
  platform: string;
  experience_level: string;
  apply_url: string;
  posted_at: string | null;
  scraped_at: string;
  is_active: boolean;
}

type SortBy = 'best_match' | 'most_recent' | 'company';

const SESSION_ID = (() => {
  let id = localStorage.getItem('job_session_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('job_session_id', id); }
  return id;
})();

const PLATFORM_COLORS: Record<string, string> = {
  greenhouse: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  lever: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  workday: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
};

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return 'Recently';
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

function matchScore(job: Job, role: string, location: string, skills: string[]): number {
  let score = 0;
  const titleLower = job.title.toLowerCase();
  const roleLower = role.toLowerCase();
  
  // Title match
  if (roleLower && titleLower.includes(roleLower)) score += 40;
  else if (roleLower) {
    const words = roleLower.split(/\s+/);
    const matched = words.filter(w => titleLower.includes(w)).length;
    score += Math.round((matched / words.length) * 25);
  }

  // Location match
  const locLower = location.toLowerCase();
  const jobLoc = (job.location || '').toLowerCase();
  if (locLower && (jobLoc.includes(locLower) || locLower === 'remote' && jobLoc.includes('remote'))) {
    score += 25;
  }

  // Skill overlap
  if (skills.length > 0) {
    const jobSkills = job.skills.map(s => s.toLowerCase());
    const jobDesc = (job.description || '').toLowerCase();
    const overlap = skills.filter(s => jobSkills.includes(s.toLowerCase()) || jobDesc.includes(s.toLowerCase()));
    score += Math.min(35, Math.round((overlap.length / skills.length) * 35));
  }

  // Recency bonus
  if (job.posted_at) {
    const days = (Date.now() - new Date(job.posted_at).getTime()) / 86400000;
    if (days < 2) score += 5;
    else if (days < 5) score += 3;
  }

  return Math.min(100, score);
}

const Jobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  // Filters
  const [role, setRole] = useState(() => localStorage.getItem('job_pref_role') || '');
  const [location, setLocation] = useState(() => localStorage.getItem('job_pref_location') || '');
  const [skillsInput, setSkillsInput] = useState(() => localStorage.getItem('job_pref_skills') || '');
  const [sortBy, setSortBy] = useState<SortBy>('best_match');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const skills = useMemo(() => skillsInput.split(',').map(s => s.trim()).filter(Boolean), [skillsInput]);

  // Persist preferences
  useEffect(() => { localStorage.setItem('job_pref_role', role); }, [role]);
  useEffect(() => { localStorage.setItem('job_pref_location', location); }, [location]);
  useEffect(() => { localStorage.setItem('job_pref_skills', skillsInput); }, [skillsInput]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .order('posted_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setJobs((data as Job[]) || []);

      // Fetch saved
      const { data: saved } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('session_id', SESSION_ID);
      setSavedJobIds(new Set((saved || []).map((s: any) => s.job_id)));
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleScrape = async () => {
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-jobs');
      if (error) throw error;
      toast.success(`Scraped ${data.total} fresher jobs (${data.inserted} new)`);
      fetchJobs();
    } catch (e: any) {
      toast.error(e.message || 'Failed to scrape jobs');
    } finally {
      setScraping(false);
    }
  };

  const toggleSave = async (jobId: string) => {
    const isSaved = savedJobIds.has(jobId);
    if (isSaved) {
      await supabase.from('saved_jobs').delete().eq('job_id', jobId).eq('session_id', SESSION_ID);
      setSavedJobIds(prev => { const n = new Set(prev); n.delete(jobId); return n; });
    } else {
      await supabase.from('saved_jobs').insert({ job_id: jobId, session_id: SESSION_ID });
      setSavedJobIds(prev => new Set(prev).add(jobId));
    }
  };

  const sortedJobs = useMemo(() => {
    let filtered = jobs;
    if (platformFilter !== 'all') filtered = filtered.filter(j => j.platform === platformFilter);

    const scored = filtered.map(j => ({ ...j, _score: matchScore(j, role, location, skills) }));

    switch (sortBy) {
      case 'best_match': scored.sort((a, b) => b._score - a._score); break;
      case 'most_recent': scored.sort((a, b) => new Date(b.posted_at || 0).getTime() - new Date(a.posted_at || 0).getTime()); break;
      case 'company': scored.sort((a, b) => a.company.localeCompare(b.company)); break;
    }
    return scored;
  }, [jobs, role, location, skills, sortBy, platformFilter]);

  const recommended = useMemo(() => sortedJobs.filter(j => j._score >= 30).slice(0, 10), [sortedJobs]);
  const recent = useMemo(() => [...jobs].sort((a, b) => new Date(b.posted_at || 0).getTime() - new Date(a.posted_at || 0).getTime()).slice(0, 10), [jobs]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-background/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Briefcase className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold font-display tracking-tight text-foreground">
                Fresher <span className="text-primary">Jobs</span>
              </h1>
              <p className="text-xs text-muted-foreground leading-none">Entry-level recommendations</p>
            </div>
          </div>
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {scraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {scraping ? 'Scraping...' : 'Refresh Jobs'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Preference Inputs */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold font-display">Your Preferences</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preferred Role</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Backend Engineer"
                  className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preferred Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Bangalore, Remote"
                  className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Skills (comma separated)</label>
              <input
                value={skillsInput}
                onChange={e => setSkillsInput(e.target.value)}
                placeholder="e.g. Python, React, AWS"
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Sort & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-muted-foreground mr-1">Sort:</span>
          {(['best_match', 'most_recent', 'company'] as SortBy[]).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                sortBy === s ? 'bg-primary/15 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border hover:border-primary/20'
              }`}
            >
              {s === 'best_match' ? 'Best Match' : s === 'most_recent' ? 'Most Recent' : 'Company'}
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-3 mr-1">Platform:</span>
          {['all', 'greenhouse', 'lever', 'workday'].map(p => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                platformFilter === p ? 'bg-primary/15 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border hover:border-primary/20'
              }`}
            >
              {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{sortedJobs.length} jobs</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold font-display text-foreground mb-2">No jobs yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Click "Refresh Jobs" to scrape fresher positions from Greenhouse, Lever, and Workday.
            </p>
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {scraping ? 'Scraping...' : 'Scrape Fresher Jobs'}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Recommended Section */}
            {recommended.length > 0 && (role || location || skills.length > 0) && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold font-display text-foreground">Recommended for You</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommended.map(job => (
                    <JobCard key={job.id} job={job} score={job._score} isSaved={savedJobIds.has(job.id)} onToggleSave={toggleSave} />
                  ))}
                </div>
              </section>
            )}

            {/* All Jobs / Recently Posted */}
            <section>
              <h2 className="text-sm font-bold font-display text-foreground mb-4">
                {role || location || skills.length > 0 ? 'All Fresher Jobs' : 'Recently Posted Fresher Jobs'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedJobs.map(job => (
                  <JobCard key={job.id} job={job} score={job._score} isSaved={savedJobIds.has(job.id)} onToggleSave={toggleSave} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

interface JobCardProps {
  job: Job & { _score: number };
  score: number;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, score, isSaved, onToggleSave }) => (
  <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all group">
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate">{job.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {score > 0 && (
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
            score >= 60 ? 'bg-emerald-500/15 text-emerald-400' : score >= 30 ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground'
          }`}>
            {score}%
          </span>
        )}
        <button onClick={() => onToggleSave(job.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          {isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <BookmarkPlus className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>
    </div>

    <div className="flex items-center gap-2 mb-3 flex-wrap">
      {job.location && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {job.location}
        </span>
      )}
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${PLATFORM_COLORS[job.platform] || 'bg-muted text-muted-foreground border-border'}`}>
        {job.platform}
      </span>
      <span className="text-[10px] text-muted-foreground ml-auto">
        {daysAgo(job.posted_at)}
      </span>
    </div>

    {job.skills.length > 0 && (
      <div className="flex flex-wrap gap-1 mb-3">
        {job.skills.slice(0, 5).map(s => (
          <span key={s} className="px-2 py-0.5 rounded-md text-[10px] bg-muted text-muted-foreground border border-border">
            {s}
          </span>
        ))}
        {job.skills.length > 5 && (
          <span className="text-[10px] text-muted-foreground self-center">+{job.skills.length - 5}</span>
        )}
      </div>
    )}

    <a
      href={job.apply_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
    >
      <ExternalLink className="w-3 h-3" />
      Apply Now
    </a>
  </div>
);

export default Jobs;
