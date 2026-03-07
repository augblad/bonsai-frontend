import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Loader2 } from "lucide-react";
import { projectCreate, openDirectory } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateProjectModal({ open, onOpenChange, onCreated }: Props) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [binaryOpt, setBinaryOpt] = useState(true);
  const [autoWatch, setAutoWatch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !path.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await projectCreate(path, name);
      if (res.status === "error") {
        setError(res.error === "duplicate_name" ? "A project with this name already exists." : "Failed to create project. Please try again.");
      } else {
        toast.success(`Project "${name}" created`);
        const createdPath = path;
        setName("");
        setPath("");
        onOpenChange(false);
        onCreated();
        navigate(`/project/${encodeURIComponent(createdPath)}`);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="My Awesome Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-path">Project Folder</Label>
            <div className="flex gap-2">
              <Input
                id="project-path"
                placeholder="/Users/you/projects/my-project"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Button variant="outline" size="sm" onClick={async () => {
                const result = await openDirectory("Select Project Folder", path || undefined);
                if (!result.canceled && result.path) setPath(result.path);
              }}>
                Browse
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
