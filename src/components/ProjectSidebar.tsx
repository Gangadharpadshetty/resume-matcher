import React from 'react';
import { FolderOpen, Plus, Trash2, Clock, FileText, Loader2 } from 'lucide-react';
import type { Project } from '@/hooks/useProjects';

interface ProjectSidebarProps {
  projects: Project[];
  loading: boolean;
  currentProjectId: string | null;
  onLoad: (project: Project) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects, loading, currentProjectId, onLoad, onDelete, onNew,
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-up">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-display">Saved Projects</h3>
            <p className="text-xs text-muted-foreground">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No saved projects yet</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Save your first project below</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors group ${
                  currentProjectId === project.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                }`}
                onClick={() => onLoad(project)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {project.ats_score != null && (
                      <span className="text-xs font-medium text-primary">{project.ats_score}% ATS</span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
