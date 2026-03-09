import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { GitBranch, Tag, Clock, Circle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MilestoneRecord, TagDefinition } from "@/lib/api";
import { BRANCH_COLOR_PALETTE } from "@/components/MilestoneNode";

interface TimelineViewProps {
  milestones: MilestoneRecord[];
  activeMilestoneId: string | null;
  branches: string[];
  branchColorsEnabled: boolean;
  projectTags: TagDefinition[];
  filteredIds: Set<string> | null; // null = show all
  onMilestoneClick: (milestone: MilestoneRecord) => void;
}

interface DayGroup {
  date: string; // e.g. "2026-03-06"
  label: string; // e.g. "March 6, 2026"
  milestones: MilestoneRecord[];
}

export function TimelineView({
  milestones,
  activeMilestoneId,
  branches,
  branchColorsEnabled,
  projectTags,
  filteredIds,
  onMilestoneClick,
}: TimelineViewProps) {
  // Branch color map
  const branchColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!branchColorsEnabled) return map;
    branches.forEach((b, i) => {
      map.set(b, BRANCH_COLOR_PALETTE[i % BRANCH_COLOR_PALETTE.length]);
    });
    return map;
  }, [branchColorsEnabled, branches]);

  // Tag color map
  const tagColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of projectTags) map[t.label] = t.color;
    return map;
  }, [projectTags]);

  // Sort milestones chronologically (newest first) and group by day
  const dayGroups = useMemo(() => {
    const sorted = [...milestones].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const groups: DayGroup[] = [];
    let currentDate = "";
    let currentGroup: DayGroup | null = null;

    for (const ms of sorted) {
      const d = format(new Date(ms.createdAt), "yyyy-MM-dd");
      if (d !== currentDate) {
        currentDate = d;
        currentGroup = {
          date: d,
          label: format(new Date(ms.createdAt), "MMMM d, yyyy"),
          milestones: [],
        };
        groups.push(currentGroup);
      }
      currentGroup!.milestones.push(ms);
    }

    return groups;
  }, [milestones]);

  if (milestones.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No milestones yet. Create one to get started.
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-2xl mx-auto py-8 px-6">
        {dayGroups.map((group, gi) => (
          <div key={group.date} className={cn(gi > 0 && "mt-8")}>
            {/* Day header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {group.label}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Milestones in this day */}
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

              {group.milestones.map((ms, mi) => {
                const isActive = ms.milestoneId === activeMilestoneId;
                const branchColor = branchColorMap.get(ms.branch) || null;
                const isDimmed = filteredIds !== null && !filteredIds.has(ms.milestoneId);

                return (
                  <div
                    key={ms.milestoneId}
                    className={cn(
                      "relative flex gap-4 pb-6 last:pb-0 cursor-pointer group transition-opacity",
                      isDimmed && "opacity-25"
                    )}
                    onClick={() => onMilestoneClick(ms)}
                  >
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0 mt-1">
                      {isActive ? (
                        <div
                          className="w-[10px] h-[10px] rounded-full ring-4 ring-primary/30"
                          style={{ backgroundColor: branchColor || "hsl(var(--primary))" }}
                        />
                      ) : (
                        <Circle
                          size={10}
                          className="text-muted-foreground fill-card"
                          strokeWidth={2}
                          style={branchColor ? { color: branchColor } : undefined}
                        />
                      )}
                    </div>

                    {/* Card */}
                    <div
                      className={cn(
                        "flex-1 rounded-lg border bg-card p-3.5 transition-all",
                        "hover:border-primary/40 hover:shadow-sm",
                        isActive && "border-primary/60 shadow-sm ring-1 ring-primary/20"
                      )}
                      style={
                        branchColor && isActive
                          ? {
                              borderColor: branchColor,
                              boxShadow: `0 0 0 1px ${branchColor}33`,
                            }
                          : branchColor
                          ? { borderLeftColor: branchColor, borderLeftWidth: 3 }
                          : undefined
                      }
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{ms.message}</p>
                          {ms.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {ms.description}
                            </p>
                          )}
                        </div>
                        {isActive && (
                          <span className="shrink-0 text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} />
                          {format(new Date(ms.createdAt), "h:mm a")}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <GitBranch size={10} />
                          {ms.branch}
                        </span>
                        <span className="text-[10px] font-mono">{ms.commitHash.slice(0, 7)}</span>
                      </div>

                      {/* Tags */}
                      {ms.tags && ms.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ms.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[9px] font-medium text-white"
                              style={{ backgroundColor: tagColorMap[tag] || "#6b7280" }}
                            >
                              <Tag size={7} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
