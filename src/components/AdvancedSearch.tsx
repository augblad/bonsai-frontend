import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Search, X, CalendarIcon, Tag, FileText, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { TagDefinition, MilestoneRecord } from "@/lib/api";

export interface SearchFilters {
  text: string;
  tags: string[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  description: string;
}

const EMPTY_FILTERS: SearchFilters = {
  text: "",
  tags: [],
  dateFrom: undefined,
  dateTo: undefined,
  description: "",
};

interface AdvancedSearchProps {
  visible: boolean;
  projectTags: TagDefinition[];
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClose: () => void;
  matchCount: number;
  totalCount: number;
}

/** Returns the set of matching milestone IDs (or null if no filters active). */
export function applyFilters(
  milestones: MilestoneRecord[],
  filters: SearchFilters
): Set<string> | null {
  const hasText = filters.text.trim().length > 0;
  const hasTags = filters.tags.length > 0;
  const hasDateFrom = !!filters.dateFrom;
  const hasDateTo = !!filters.dateTo;
  const hasDesc = filters.description.trim().length > 0;

  if (!hasText && !hasTags && !hasDateFrom && !hasDateTo && !hasDesc) return null;

  const q = filters.text.toLowerCase();
  const descQ = filters.description.toLowerCase();

  const matched = new Set<string>();

  for (const ms of milestones) {
    // Text filter: matches message, branch, or tags
    if (hasText) {
      const textMatch =
        ms.message?.toLowerCase().includes(q) ||
        ms.branch?.toLowerCase().includes(q) ||
        ms.tags?.some((t) => t.toLowerCase().includes(q));
      if (!textMatch) continue;
    }

    // Tag filter: milestone must have ALL selected tags
    if (hasTags) {
      const msTags = ms.tags || [];
      const allMatch = filters.tags.every((t) => msTags.includes(t));
      if (!allMatch) continue;
    }

    // Date range filter
    const msDate = new Date(ms.createdAt);
    if (hasDateFrom && msDate < filters.dateFrom!) continue;
    if (hasDateTo) {
      // Make dateTo inclusive (end of day)
      const endOfDay = new Date(filters.dateTo!);
      endOfDay.setHours(23, 59, 59, 999);
      if (msDate > endOfDay) continue;
    }

    // Description filter
    if (hasDesc) {
      const descMatch = ms.description?.toLowerCase().includes(descQ);
      if (!descMatch) continue;
    }

    matched.add(ms.milestoneId);
  }

  return matched;
}

export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.text.trim().length > 0 ||
    filters.tags.length > 0 ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    filters.description.trim().length > 0
  );
}

export { EMPTY_FILTERS };

export function AdvancedSearch({
  visible,
  projectTags,
  filters,
  onFiltersChange,
  onClose,
  matchCount,
  totalCount,
}: AdvancedSearchProps) {
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  const isFiltered = hasActiveFilters(filters);

  const update = (partial: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const toggleTag = (tag: string) => {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    update({ tags: next });
  };

  const clearAll = () => {
    onFiltersChange(EMPTY_FILTERS);
  };

  if (!visible) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 border-b border-border bg-card shadow-md animate-in slide-in-from-top-1 duration-150">
      <div className="px-4 py-3 space-y-3">
        {/* Row 1: Text inputs */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-[220px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-8"
              placeholder="Search name, branch..."
              value={filters.text}
              onChange={(e) => update({ text: e.target.value })}
              autoFocus
            />
          </div>
          <div className="relative flex-1 max-w-[220px]">
            <FileText size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-8"
              placeholder="Search description..."
              value={filters.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>
          <div className="flex-1" />
          {isFiltered && (
            <span className="text-[11px] text-muted-foreground">
              {matchCount} / {totalCount} matches
            </span>
          )}
          {isFiltered && (
            <button
              onClick={clearAll}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Close search"
          >
            <X size={14} />
          </button>
        </div>

        {/* Row 2: Tags + Date range */}
        <div className="flex items-center gap-2">
          {/* Tag filter */}
          {projectTags.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-7 text-xs gap-1.5", filters.tags.length > 0 && "border-primary/50 text-primary")}
                >
                  <Tag size={12} />
                  Tags
                  {filters.tags.length > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] min-w-[18px] text-center">
                      {filters.tags.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="start">
                <p className="text-xs font-medium text-muted-foreground px-1 pb-1.5">Filter by tag</p>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {projectTags.map((tag) => {
                    const selected = filters.tags.includes(tag.label);
                    return (
                      <button
                        key={tag.label}
                        onClick={() => toggleTag(tag.label)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                          selected ? "bg-accent" : "hover:bg-accent/50"
                        )}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 truncate">{tag.label}</span>
                        {selected && <span className="text-primary text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <span className="text-[11px] text-muted-foreground">Date:</span>

          {/* Date range: From */}
          <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-7 text-xs gap-1.5", filters.dateFrom && "border-primary/50 text-primary")}
              >
                <CalendarIcon size={12} />
                {filters.dateFrom ? format(filters.dateFrom, "MMM d") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(d) => {
                  update({ dateFrom: d });
                  setDateFromOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-[11px] text-muted-foreground">–</span>

          {/* Date range: To */}
          <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-7 text-xs gap-1.5", filters.dateTo && "border-primary/50 text-primary")}
              >
                <CalendarIcon size={12} />
                {filters.dateTo ? format(filters.dateTo, "MMM d") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(d) => {
                  update({ dateTo: d });
                  setDateToOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
