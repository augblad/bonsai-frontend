import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { format } from "date-fns";
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
}

function MilestoneNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as MilestoneNodeData;

  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-muted-foreground !border-none" isConnectable={false} />
      <div
        className={cn(
          "px-4 py-3 rounded-xl border bg-node-bg border-node-border min-w-[180px] max-w-[240px] transition-all cursor-pointer select-none",
          "hover:border-primary/50",
          selected && "border-primary",
          d.isActive && "ring-2 ring-node-glow node-active-glow border-node-glow"
        )}
      >
        <p className="text-sm font-medium truncate">{d.message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {d.branch}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {format(new Date(d.createdAt), "MMM d, yyyy · h:mm a")}
        </p>
      </div>
      {d.hasChildren && <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-muted-foreground !border-none" isConnectable={false} />}
    </>
  );
}

export const MilestoneNode = memo(MilestoneNodeComponent);
