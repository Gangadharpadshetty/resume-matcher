import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SESSION_KEY = 'resumematch_session_id';

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export interface Project {
  id: string;
  session_id: string;
  name: string;
  resume_text: string | null;
  resume_file_name: string | null;
  job_description: string | null;
  job_url: string | null;
  latex_code: string | null;
  ats_score: number | null;
  matched_keywords: string[] | null;
  missing_keywords: string[] | null;
  strategy_name: string | null;
  reward_scores: any;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const sessionId = getSessionId();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false });
    if (!error && data) setProjects(data as Project[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const saveProject = useCallback(async (projectData: Partial<Project>) => {
    const payload = { ...projectData, session_id: sessionId };

    if (currentProjectId) {
      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', currentProjectId);
      if (error) { toast.error('Failed to save project'); return null; }
      toast.success('Project saved');
      fetchProjects();
      return currentProjectId;
    } else {
      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select('id')
        .single();
      if (error || !data) { toast.error('Failed to save project'); return null; }
      setCurrentProjectId(data.id);
      toast.success('Project saved');
      fetchProjects();
      return data.id;
    }
  }, [sessionId, currentProjectId, fetchProjects]);

  const loadProject = useCallback((project: Project) => {
    setCurrentProjectId(project.id);
    return project;
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    if (currentProjectId === id) setCurrentProjectId(null);
    toast.success('Project deleted');
    fetchProjects();
  }, [currentProjectId, fetchProjects]);

  const newProject = useCallback(() => {
    setCurrentProjectId(null);
  }, []);

  return { projects, loading, currentProjectId, saveProject, loadProject, deleteProject, newProject, fetchProjects };
}
