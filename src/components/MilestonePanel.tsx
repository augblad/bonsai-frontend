import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  RotateCcw, Trash2, Loader2, FileText, Hash, GitBranch, Calendar,
  ChevronDown, ChevronUp, Pencil, Check, X, Download, Tag, FolderArchive,
  GitFork, Plus,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  milestoneStorageSize,
  milestoneTrackedFiles,
  milestoneRename,
  milestoneSetTags,
  milestoneExportZip,
  milestoneSetDescription,
  projectGetTags,
  projectSetTags,
} from "@/lib/api";
import type { MilestoneRecord, TagDefinition } from "@/lib/api";
import { toast } from "sonner";

const TAG_COLOR_OPTIONS = [
  "#22c55e", "#a855f7", "#f59e0b", "#3b82f6", "#6b7280",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: MilestoneRecord | null;
  projectPath: string;
  hasChildren: boolean;
  isActive: boolean;
  onRestore: () => void;
  onDelete: () => void;
  onBranchFromHere: () => void;
  restoring: boolean;
  deleting: boolean;
  branching: boolean;
  onMilestoneUpdated: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function MilestonePanel({
  open,
  onOpenChange,
  milestone,
  projectPath,
  hasChildren,
  isActive,
  onRestore,
  onDelete,
  onBranchFromHere,
  restoring,
  deleting,
  branching,
  onMilestoneUpdated,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [trackedFiles, setTrackedFiles] = useState<string[]>([]);
  const [storageBytes, setStorageBytes] = useState<number | null>(null);
  const [filesOpen, setFilesOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [exporting, setExporting] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [projectTags, setProjectTags] = useState<TagDefinition[]>([]);
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLOR_OPTIONS[0]);

  // Load storage size and tracked files when panel opens
  useEffect(() => {
    if (!open || !milestone) return;
    setStorageBytes(null);
    setTrackedFiles([]);
    setRenaming(false);
    setEditingDesc(false);
    setCreatingTag(false);

    milestoneStorageSize(projectPath, milestone.milestoneId)
      .then((res) => setStorageBytes(res.totalBytes))
      .catch(() => {});

    milestoneTrackedFiles(projectPath, milestone.milestoneId)
      .then((files) => setTrackedFiles(files))
      .catch(() => {});

    projectGetTags(projectPath)
      .then((tags) => setProjectTags(tags))
      .catch(() => {});
  }, [open, milestone?.milestoneId, projectPath]);

  if (!milestone) return null;

  const handleRenameStart = () => {
    setRenameValue(milestone.message);
    setRenaming(true);
  };

  const handleRenameConfirm = async () => {
    if (!renameValue.trim() || renameValue === milestone.message) {
      setRenaming(false);
      return;
    }
    const res = await milestoneRename(projectPath, milestone.milestoneId, renameValue.trim());
    if (res.status === "success") {
      toast.success("Milestone renamed");
      onMilestoneUpdated();
    } else {
      toast.error("Failed to rename milestone");
    }
    setRenaming(false);
  };

  const handleToggleTag = async (tagLabel: string) => {
    const currentTags = milestone.tags || [];
    const newTags = currentTags.includes(tagLabel)
      ? currentTags.filter((t) => t !== tagLabel)
      : [...currentTags, tagLabel];
    const res = await milestoneSetTags(projectPath, milestone.milestoneId, newTags);
    if (res.status === "success") {
      onMilestoneUpdated();
    } else {
      toast.error("Failed to update tags");
    }
  };

  const handleExportZip = async () => {
    setExporting(true);
    try {
      const res = await milestoneExportZip(projectPath, milestone.milestoneId);
      if (res.status === "success") {
        toast.success("Exported successfully");
      } else if (res.status !== "canceled") {
        toast.error("Export failed");
      }
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleCreateTag = async () => {
    const label = newTagLabel.trim();
    if (!label) return;
    if (projectTags.some((t) => t.label === label)) {
      toast.error("Tag already exists");
      return;
    }
    const updated = [...projectTags, { label, color: newTagColor }];
    const res = await projectSetTags(projectPath, updated);
    if (res.status === "success") {
      setProjectTags(updated);
      setNewTagLabel("");
      setNewTagColor(TAG_COLOR_OPTIONS[0]);
      setCreatingTag(false);
      toast.success("Tag created");
    } else {
      toast.error("Failed to create tag");
    }
  };

  const handleDescEdit = () => {
    setDescValue(milestone.description || "");
    setEditingDesc(true);
  };

  const handleDescConfirm = async () => {
    const trimmed = descValue.trim();
    if (trimmed === (milestone.description || "")) {
      setEditingDesc(false);
      return;
    }
    const res = await milestoneSetDescription(projectPath, milestone.milestoneId, trimmed);
    if (res.status === "success") {
      toast.success(trimmed ? "Description updated" : "Description removed");
      onMilestoneUpdated();
    } else {
      toast.error("Failed to update description");
    }
    setEditingDesc(false);
  };

  const patchSize = storageBytes !== null ? formatBytes(storageBytes) : "…";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] bg-panel border-l border-border flex flex-col">
        <SheetHeader>
          {renaming ? (
            <div className="flex items-center gap-2">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRenameConfirm(); if (e.key === "Escape") setRenaming(false); }}
                className="text-lg h-8"
                autoFocus
              />
              <button onClick={handleRenameConfirm} className="text-primary hover:text-primary/80"><Check size={16} /></button>
              <button onClick={() => setRenaming(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
          ) : (
            <SheetTitle className="text-lg flex items-center gap-2">
              {milestone.message}
              <button onClick={handleRenameStart} className="text-muted-foreground hover:text-foreground transition-colors">
                <Pencil size={14} />
              </button>
            </SheetTitle>
          )}
        </SheetHeader>

        <div className="mt-6 flex-1 overflow-y-auto space-y-4">
          {isActive && (
            <Badge variant="outline" className="border-primary text-primary text-xs">
              Active Milestone
            </Badge>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {projectTags.map((tag) => {
              const active = milestone.tags?.includes(tag.label);
              return (
                <button
                  key={tag.label}
                  onClick={() => handleToggleTag(tag.label)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                    active
                      ? "border-transparent text-white"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                  style={active ? { backgroundColor: tag.color } : {}}
                >
                  {tag.label}
                </button>
              );
            })}
            {!creatingTag && (
              <button
                onClick={() => setCreatingTag(true)}
                className="px-1.5 py-0.5 rounded-full text-[10px] border border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-all flex items-center gap-0.5"
              >
                <Plus size={10} /> tag
              </button>
            )}
          </div>
          {creatingTag && (
            <div className="flex flex-col gap-1.5 p-2 rounded-md border border-border bg-accent/50">
              <Input
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag(); if (e.key === "Escape") setCreatingTag(false); }}
                placeholder="Tag name"
                className="h-7 text-xs"
                autoFocus
              />
              <div className="flex gap-1">
                {TAG_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewTagColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${newTagColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleCreateTag} className="text-primary hover:text-primary/80"><Check size={14} /></button>
                <button onClick={() => setCreatingTag(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</p>
              {!editingDesc && (
                <button onClick={handleDescEdit} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil size={10} />
                </button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-1.5">
                <textarea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setEditingDesc(false); }}
                  className="w-full text-sm bg-accent rounded px-2 py-1.5 border border-border resize-none min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Add a description..."
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <button onClick={handleDescConfirm} className="text-primary hover:text-primary/80"><Check size={14} /></button>
                  <button onClick={() => setEditingDesc(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${milestone.description ? "" : "text-muted-foreground italic"}`}>
                {milestone.description || "No description"}
              </p>
            )}
          </div>

          <DetailRow icon={Calendar} label="Created" value={format(new Date(milestone.createdAt), "PPpp")} />

          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <span>Details</span>
            {detailsOpen ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
          </button>

          {detailsOpen && (
            <div className="space-y-3 pl-1 animate-in fade-in-0 slide-in-from-top-1">
              <DetailRow icon={Hash} label="Commit Hash" value={milestone.commitHash} mono />
              <DetailRow icon={GitBranch} label="Branch" value={milestone.branch} />
              <DetailRow icon={FolderArchive} label="Storage Size" value={patchSize} />
            </div>
          )}

          {/* Tracked files */}
          <button
            onClick={() => setFilesOpen(!filesOpen)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <FileText size={12} />
            <span>Tracked Files ({trackedFiles.length})</span>
            {filesOpen ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
          </button>

          {filesOpen && trackedFiles.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto pl-1 animate-in fade-in-0 slide-in-from-top-1">
              {trackedFiles.map((f) => (
                <div key={f} className="text-xs font-mono text-muted-foreground bg-accent rounded px-2 py-1 truncate">
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2 pt-3 pb-2">
          <Button onClick={onRestore} disabled={restoring || isActive} className="w-full">
            {restoring ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RotateCcw size={16} className="mr-2" />}
            Restore to this state
          </Button>

          <Button variant="outline" onClick={onBranchFromHere} disabled={branching || isActive} className="w-full">
            {branching ? <Loader2 size={16} className="mr-2 animate-spin" /> : <GitFork size={16} className="mr-2" />}
            Branch from here
          </Button>

          <Button variant="outline" onClick={handleExportZip} disabled={exporting} className="w-full">
            {exporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
            Export as ZIP
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={hasChildren || deleting} className="w-full text-destructive hover:text-destructive">
                {deleting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Trash2 size={16} className="mr-2" />}
                Delete Milestone
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this milestone?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove "{milestone.message}" and its saved data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {hasChildren && (
            <p className="text-xs text-muted-foreground text-center">
              Cannot delete — this milestone has children.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={14} className="text-muted-foreground shrink-0" stroke={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-sm truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
