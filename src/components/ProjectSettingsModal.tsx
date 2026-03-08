import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { autoWatchStart, autoWatchStop, autoWatchStatus } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectPath: string;
}

export function ProjectSettingsModal({ open, onOpenChange, projectName, projectPath }: Props) {
  const [autoWatch, setAutoWatch] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch current status when the modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    autoWatchStatus(projectPath)
      .then((res) => setAutoWatch(res.active))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, projectPath]);

  const handleToggle = async (checked: boolean) => {
    setAutoWatch(checked);
    try {
      if (checked) {
        await autoWatchStart(projectPath);
        toast.success("Auto-watch enabled");
      } else {
        await autoWatchStop(projectPath);
        toast.success("Auto-watch disabled");
      }
    } catch {
      setAutoWatch(!checked); // revert on error
      toast.error("Failed to update auto-watch");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{projectName} Settings</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-watch for changes</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically creates a milestone when files change (10s debounce)</p>
            </div>
            <Switch checked={autoWatch} onCheckedChange={handleToggle} disabled={loading} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
