import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
}

export function ProjectSettingsModal({ open, onOpenChange, projectName }: Props) {
  const [autoWatch, setAutoWatch] = useState(false);

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
              <p className="text-xs text-muted-foreground mt-0.5">Automatically detect file changes and prompt for milestones</p>
            </div>
            <Switch checked={autoWatch} onCheckedChange={setAutoWatch} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
