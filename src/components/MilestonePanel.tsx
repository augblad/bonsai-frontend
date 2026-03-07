import { format } from "date-fns";
import { RotateCcw, Trash2, Loader2, FileText, Hash, GitBranch, Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
import type { MilestoneRecord } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: MilestoneRecord | null;
  hasChildren: boolean;
  isActive: boolean;
  onRestore: () => void;
  onDelete: () => void;
  restoring: boolean;
  deleting: boolean;
}

export function MilestonePanel({
  open,
  onOpenChange,
  milestone,
  hasChildren,
  isActive,
  onRestore,
  onDelete,
  restoring,
  deleting,
}: Props) {
  if (!milestone) return null;

  const mockPatchSize = `${(milestone.patchFiles.length * 15 + 3).toFixed(0)} MB`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] bg-panel border-l border-border">
        <SheetHeader>
          <SheetTitle className="text-lg">{milestone.message}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isActive && (
            <Badge variant="outline" className="border-primary text-primary text-xs">
              Active Milestone
            </Badge>
          )}

          <div className="space-y-3">
            <DetailRow icon={Hash} label="Commit Hash" value={milestone.commitHash} mono />
            <DetailRow icon={GitBranch} label="Branch" value={milestone.branch} />
            <DetailRow icon={Calendar} label="Created" value={format(new Date(milestone.createdAt), "PPpp")} />
            <DetailRow icon={FileText} label="Patch Size" value={mockPatchSize} />
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Patch Files</p>
            <div className="space-y-1">
              {milestone.patchFiles.map((f) => (
                <div key={f} className="text-xs font-mono text-muted-foreground bg-accent rounded px-2 py-1">
                  {f}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2 pt-2">
            <Button onClick={onRestore} disabled={restoring || isActive} className="w-full">
              {restoring ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RotateCcw size={16} className="mr-2" />}
              Restore to this state
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={hasChildren || deleting} className="w-full text-destructive hover:text-destructive">
                  {deleting ? <IconLoader2 size={16} className="mr-2 animate-spin" /> : <IconTrash size={16} className="mr-2" />}
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
