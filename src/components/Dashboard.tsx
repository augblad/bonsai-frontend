import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Trash2, Folder, Clock, GitBranch, Pencil } from "lucide-react";
import { projectList, projectDelete, projectRename, autoWatchStatus, type ProjectSummary } from "@/lib/api";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { toast } from "sonner";

export function Dashboard({ onNewProject }: { onNewProject: () => void }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [renameTarget, setRenameTarget] = useState<ProjectSummary | null>(null);
  const [newName, setNewName] = useState("");
  const [watchedPaths, setWatchedPaths] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const list = await projectList();
    setProjects(list);
    // Check auto-watch status for each project
    const watched = new Set<string>();
    await Promise.all(
      list.map(async (p) => {
        try {
          const res = await autoWatchStatus(p.projectPath);
          if (res.active) watched.add(p.projectPath);
        } catch {}
      }),
    );
    setWatchedPaths(watched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await projectDelete(deleteTarget.projectPath);
    setDeleteTarget(null);
    load();
  };

  const handleRename = async () => {
    if (!renameTarget || !newName.trim()) return;
    try {
      await projectRename(renameTarget.projectPath, newName.trim());
      toast.success("Project renamed");
      setRenameTarget(null);
      setNewName("");
      load();
    } catch {
      toast.error("Failed to rename project");
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-6">Projects</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-2">
          <Folder size={32} className="text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-semibold">No projects yet</h2>
        <p className="text-muted-foreground text-sm max-w-xs text-center">
          Create your first project to start tracking milestones with Bonsai.
        </p>
        <Button onClick={onNewProject} className="mt-2">
          Create your first project
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button onClick={onNewProject} size="sm">New Project</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project, i) => (
          <ContextMenu key={project.id}>
            <ContextMenuTrigger>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/project/${encodeURIComponent(project.projectPath)}`)}
                className="group cursor-pointer rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <h3 className="font-medium text-sm mb-1">{project.name}</h3>
                <p className="text-xs text-muted-foreground font-mono break-all mb-3">{project.projectPath}</p>
                {project.lastMilestoneMessage && (
                  <p className="text-xs text-muted-foreground mb-2 truncate italic">
                    Last: {project.lastMilestoneMessage}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GitBranch size={14} strokeWidth={1.5} />
                    {project.milestoneCount} milestones
                  </span>
                  {project.lastMilestoneAt && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} strokeWidth={1.5} />
                      {formatDistanceToNow(new Date(project.lastMilestoneAt), { addSuffix: true })}
                    </span>
                  )}
                  {watchedPaths.has(project.projectPath) && (
                    <span className="flex items-center gap-1 text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Auto-watch
                    </span>
                  )}
                </div>
              </motion.div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onClick={() => { setRenameTarget(project); setNewName(project.name); }}
              >
                <Pencil size={16} className="mr-2" strokeWidth={1.5} />
                Rename Project
              </ContextMenuItem>
              <ContextMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(project)}
              >
                <Trash2 size={16} className="mr-2" strokeWidth={1.5} />
                Delete Project
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its milestone history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => { if (!o) setRenameTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            placeholder="New project name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
