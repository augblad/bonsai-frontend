import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const BRANCH_COLOR_PALETTE = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#a855f7", // purple
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#14b8a6", // teal
];

interface MilestoneNodeData {
  label: string;
  message: string;
  commitHash: string;
  branch: string;
  createdAt: string;
  isActive: boolean;
  hasChildren: boolean;
  hasParent: boolean;
  tags?: string[];
  branchColor?: string | null;
  isVertical?: boolean;
  tagColorMap?: Record<string, string>;
  onCreateMilestone?: () => void;
}

function MilestoneNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as MilestoneNodeData;
  const [isHovered, setIsHovered] = useState(false);
  const bc = d.branchColor;
  const targetPos = d.isVertical ? Position.Top : Position.Left;
  const sourcePos = d.isVertical ? Position.Bottom : Position.Right;

  // Use only longhand border-*-color properties to avoid shorthand conflicts.
  // borderColor shorthand would clobber the accent border, so we never use it.
  // Accent border: top edge in vertical layout, left edge in horizontal layout.
  const dynamicStyle: React.CSSProperties = {};
  if (bc) {
    if (d.isVertical) {
      dynamicStyle.borderTopWidth = 3;
      dynamicStyle.borderTopColor = bc;
    } else {
      dynamicStyle.borderLeftWidth = 3;
      dynamicStyle.borderLeftColor = bc;
    }

    if (d.isActive) {
      if (d.isVertical) {
        dynamicStyle.borderLeftColor = bc;
        dynamicStyle.borderRightColor = bc;
        dynamicStyle.borderBottomColor = bc;
      } else {
        dynamicStyle.borderTopColor = bc;
        dynamicStyle.borderRightColor = bc;
        dynamicStyle.borderBottomColor = bc;
      }
      (dynamicStyle as Record<string, unknown>)["--tw-ring-color"] = hexToRgba(bc, 0.8);
      (dynamicStyle as Record<string, unknown>)["--glow-color-low"] = hexToRgba(bc, 0.4);
      (dynamicStyle as Record<string, unknown>)["--glow-color-high"] = hexToRgba(bc, 0.6);
    } else if (selected) {
      if (d.isVertical) {
        dynamicStyle.borderLeftColor = bc;
        dynamicStyle.borderRightColor = bc;
        dynamicStyle.borderBottomColor = bc;
      } else {
        dynamicStyle.borderTopColor = bc;
        dynamicStyle.borderRightColor = bc;
        dynamicStyle.borderBottomColor = bc;
      }
    } else if (isHovered) {
      const hoverColor = hexToRgba(bc, 0.5);
      if (d.isVertical) {
        dynamicStyle.borderLeftColor = hoverColor;
        dynamicStyle.borderRightColor = hoverColor;
        dynamicStyle.borderBottomColor = hoverColor;
      } else {
        dynamicStyle.borderTopColor = hoverColor;
        dynamicStyle.borderRightColor = hoverColor;
        dynamicStyle.borderBottomColor = hoverColor;
      }
    }
  }

  return (
    <div className="relative">
      {d.hasParent && <Handle type="target" position={targetPos} className="!w-2 !h-2 !bg-muted-foreground !border-none" isConnectable={false} />}
      <div
        className={cn(
          "px-4 py-3 rounded-xl border bg-node-bg border-node-border min-w-[180px] max-w-[240px] transition-all cursor-pointer select-none",
          !bc && "hover:border-primary/50",
          selected && !bc && "border-primary",
          d.isActive && "ring-2 node-active-glow",
          d.isActive && !bc && "ring-node-glow border-node-glow"
        )}
        style={dynamicStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <p className="text-sm font-medium truncate">{d.message}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {format(new Date(d.createdAt), "MMM d, yyyy · h:mm a")}
        </p>
        {d.tags && d.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {d.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-px rounded-full text-[9px] font-medium text-white"
                style={{ backgroundColor: d.tagColorMap?.[tag] || "#6b7280" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {d.hasChildren && <Handle type="source" position={sourcePos} className="!w-2 !h-2 !bg-muted-foreground !border-none" isConnectable={false} />}
      {d.isActive && d.onCreateMilestone && (
        <button
          className={cn(
            "nodrag absolute w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md transition-all z-10 cursor-pointer hover:brightness-75",
            d.isVertical
              ? "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
              : "right-0 top-1/2 translate-x-1/2 -translate-y-1/2"
          )}
          onClick={(e) => {
            e.stopPropagation();
            d.onCreateMilestone!();
          }}
          title="Create Milestone"
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

export const MilestoneNode = memo(MilestoneNodeComponent);
