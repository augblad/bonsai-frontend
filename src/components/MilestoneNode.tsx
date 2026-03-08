import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MilestoneNodeData {
  label: string;
  message: string;
  commitHash: string;
  branch: string;
  createdAt: string;
  isActive: boolean;
  hasChildren: boolean;
  hasParent: boolean;
  onCreateMilestone?: () => void;
}

function MilestoneNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as MilestoneNodeData;

  return (
    <div className="relative">
      {d.hasParent && <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-muted-foreground !border-none" isConnectable={false} />}
      <div
        className={cn(
          "px-4 py-3 rounded-xl border bg-node-bg border-node-border min-w-[180px] max-w-[240px] transition-all cursor-pointer select-none",
          "hover:border-primary/50",
          selected && "border-primary",
          d.isActive && "ring-2 ring-node-glow node-active-glow border-node-glow"
        )}
      >
        <p className="text-sm font-medium truncate">{d.message}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {format(new Date(d.createdAt), "MMM d, yyyy · h:mm a")}
        </p>
      </div>
      {d.hasChildren && <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-muted-foreground !border-none" isConnectable={false} />}
      {d.isActive && d.onCreateMilestone && (
        <button
          className="nodrag absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md transition-all z-10 cursor-pointer hover:brightness-75"
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
