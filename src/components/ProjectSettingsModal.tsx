import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { autoWatchStart, autoWatchStop, autoWatchStatus, blacklistGet, blacklistSet, openDirectory, openFile } from "@/lib/api";
import { toast } from "sonner";
import { Trash2, FilePlus, FolderPlus, File, Folder } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectPath: string;
}

export function ProjectSettingsModal({ open, onOpenChange, projectName, projectPath }: Props) {
  const [autoWatch, setAutoWatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blacklist, setBlacklist] = useState<string[]>([]);

  // Fetch current status when the modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);

    Promise.all([
      autoWatchStatus(projectPath).then((res) => setAutoWatch(res.active)),
      blacklistGet(projectPath).then((items) => setBlacklist(items)),
    ])
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

  const normalizeToProjectRelative = (absolutePath: string): string | null => {
    // Normalize separators for consistent comparison
    const normProject = projectPath.replace(/\\/g, "/");
    const normSelected = absolutePath.replace(/\\/g, "/");

    if (!normSelected.startsWith(normProject + "/") && normSelected !== normProject) {
      return null; // outside project directory
    }

    const relative = normSelected.slice(normProject.length + 1);
    return relative || null; // empty string = the project root itself, not valid
  };

  const addToBlacklist = async (relativePaths: string[]) => {
    const newItems = relativePaths.filter((p) => !blacklist.includes(p));
    if (newItems.length === 0) {
      toast.error("Already in blacklist");
      return;
    }
    const updated = [...blacklist, ...newItems];
    setBlacklist(updated);
    try {
      await blacklistSet(projectPath, updated);
      toast.success(newItems.length === 1 ? "Added to blacklist" : `Added ${newItems.length} items to blacklist`);
    } catch {
      setBlacklist(blacklist); // revert
      toast.error("Failed to update blacklist");
    }
  };

  const removeFromBlacklist = async (item: string) => {
    const updated = blacklist.filter((i) => i !== item);
    setBlacklist(updated);
    try {
      await blacklistSet(projectPath, updated);
      toast.success("Removed from blacklist");
    } catch {
      setBlacklist(blacklist); // revert
      toast.error("Failed to update blacklist");
    }
  };

  const handleAddFile = async () => {
    const result = await openFile("Select files to blacklist", projectPath, undefined, true);
    if (result.canceled || result.paths.length === 0) return;

    const relativePaths: string[] = [];
    for (const p of result.paths) {
      const relative = normalizeToProjectRelative(p);
      if (!relative) {
        toast.error("Files must be inside the project directory");
        return;
      }
      relativePaths.push(relative);
    }
    await addToBlacklist(relativePaths);
  };

  const handleAddFolder = async () => {
    const result = await openDirectory("Select folders to blacklist", projectPath, true);
    if (result.canceled || result.paths.length === 0) return;

    const relativePaths: string[] = [];
    for (const p of result.paths) {
      const relative = normalizeToProjectRelative(p);
      if (!relative) {
        toast.error("Folders must be inside the project directory");
        return;
      }
      relativePaths.push(relative);
    }
    await addToBlacklist(relativePaths);
  };

  // Guess whether a blacklisted item is a folder (heuristic: no file extension)
  const looksLikeFolder = (item: string) => {
    const lastSegment = item.split("/").pop() || "";
    return !lastSegment.includes(".");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{projectName} Settings</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {/* Auto-watch toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-watch for changes</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically creates a milestone when files change (10s debounce)</p>
            </div>
            <Switch checked={autoWatch} onCheckedChange={handleToggle} disabled={loading} />
          </div>

          <Separator />

          {/* Blacklist section */}
          <div>
            <Label className="text-sm font-medium">Blacklist</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Files and folders Bonsai will completely ignore — no version tracking, no binary diffing, no patches.
            </p>

            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleAddFile} disabled={loading}>
                <FilePlus className="h-4 w-4 mr-1.5" />
                Add Files
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddFolder} disabled={loading}>
                <FolderPlus className="h-4 w-4 mr-1.5" />
                Add Folders
              </Button>
            </div>

            {blacklist.length > 0 && (
              <div className="mt-3 max-h-60 overflow-y-auto rounded-md border scrollbar-thin">
                <div className="p-2 space-y-1">
                  {[...blacklist].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })).map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {looksLikeFolder(item) ? (
                          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{item}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFromBlacklist(item)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blacklist.length === 0 && !loading && (
              <p className="mt-3 text-xs text-muted-foreground italic">No items blacklisted.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
