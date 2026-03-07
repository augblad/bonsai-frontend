import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  IconArrowLeft,
  IconPlus,
  IconSettings,
  IconLoader2,
} from "@tabler/icons-react";
import {
  projectTree,
  milestoneCreate,
  milestoneRestore,
  milestoneDelete,
  type TreeNode,
  type MilestoneRecord,
  type ProjectTreeResponse,
} from "@/lib/api";
import { MilestoneNode } from "@/components/MilestoneNode";
import { MilestonePanel } from "@/components/MilestonePanel";
import { ProjectSettingsModal } from "@/components/ProjectSettingsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const nodeTypes = { milestone: MilestoneNode };

export function ProjectWorkspace() {
  const { projectPath } = useParams<{ projectPath: string }>();
  const decodedPath = decodeURIComponent(projectPath || "");
  const navigate = useNavigate();

  const [treeData, setTreeData] = useState<ProjectTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneRecord | null>(null);
  const [selectedHasChildren, setSelectedHasChildren] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const projectName = decodedPath.split("/").pop() || "Project";

  const loadTree = useCallback(async () => {
    setLoading(true);
    const data = await projectTree(decodedPath);
    setTreeData(data);
    setLoading(false);
  }, [decodedPath]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Convert tree to React Flow nodes/edges
  useEffect(() => {
    if (!treeData) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const Y_GAP = 100;
    const X_GAP = 300;

    // Find children count for each node
    const childrenMap = new Map<string, number>();
    const buildChildrenMap = (nodes: TreeNode[]) => {
      nodes.forEach((n) => {
        childrenMap.set(n.milestoneId, n.children.length);
        buildChildrenMap(n.children);
      });
    };
    buildChildrenMap(treeData.tree);

    let yCounter = 0;

    const traverse = (node: TreeNode, depth: number, parentId?: string) => {
      const y = yCounter * Y_GAP;
      const x = depth * X_GAP;

      newNodes.push({
        id: node.milestoneId,
        type: "milestone",
        position: { x, y },
        data: {
          label: node.message,
          message: node.message,
          commitHash: node.commitHash,
          branch: node.branch,
          createdAt: node.createdAt,
          isActive: node.milestoneId === treeData.activeMilestoneId,
          hasChildren: node.children.length > 0,
          hasParent: !!parentId,
        },
      });

      if (parentId) {
        newEdges.push({
          id: `${parentId}-${node.milestoneId}`,
          source: parentId,
          target: node.milestoneId,
          type: "smoothstep",
          style: { stroke: "hsl(var(--edge-color))", strokeWidth: 2 },
          animated: node.milestoneId === treeData.activeMilestoneId,
        });
      }

      if (node.children.length === 0) {
        yCounter++;
      } else {
        node.children.forEach((child) => {
          traverse(child, depth + 1, node.milestoneId);
        });
      }
    };

    treeData.tree.forEach((root) => traverse(root, 0));
    setNodes(newNodes);
    setEdges(newEdges);
  }, [treeData, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (!treeData) return;
      const record = treeData.milestones.find((m) => m.milestoneId === node.id);
      if (!record) return;

      const childrenMap = new Map<string, number>();
      const buildMap = (nodes: TreeNode[]) => {
        nodes.forEach((n) => {
          childrenMap.set(n.milestoneId, n.children.length);
          buildMap(n.children);
        });
      };
      buildMap(treeData.tree);

      setSelectedMilestone(record);
      setSelectedHasChildren((childrenMap.get(node.id) ?? 0) > 0);
      setPanelOpen(true);
    },
    [treeData]
  );

  const handleCreate = async () => {
    if (!createMsg.trim()) return;
    setCreating(true);
    try {
      await milestoneCreate(decodedPath, createMsg);
      toast.success("Milestone created");
      setCreateMsg("");
      setCreateOpen(false);
      loadTree();
    } catch {
      toast.error("Failed to create milestone");
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedMilestone) return;
    setRestoring(true);
    try {
      const res = await milestoneRestore(decodedPath, selectedMilestone.milestoneId);
      if (res.status === "success") {
        toast.success("Restored successfully");
        loadTree();
      } else {
        toast.error("Restore failed");
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMilestone) return;
    setDeleting(true);
    try {
      const res = await milestoneDelete(decodedPath, selectedMilestone.milestoneId);
      if (res.status === "success") {
        toast.success("Milestone deleted");
        setPanelOpen(false);
        setSelectedMilestone(null);
        loadTree();
      } else {
        toast.error("Delete failed");
      }
    } finally {
      setDeleting(false);
    }
  };

  const activeName = treeData?.milestones.find(
    (m) => m.milestoneId === treeData.activeMilestoneId
  )?.message;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-border flex items-center px-4 gap-3">
          <Skeleton className="w-24 h-5" />
          <div className="flex-1" />
          <Skeleton className="w-32 h-8" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <IconLoader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top Bar */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft size={18} stroke={1.5} />
        </button>
        <h2 className="font-semibold text-sm">{projectName}</h2>
        {activeName && (
          <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded">
            {activeName}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <IconSettings size={16} stroke={1.5} />
        </button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <IconPlus size={16} className="mr-1.5" stroke={2} />
          Create Milestone
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--canvas-dot))" />
          <Controls />
        </ReactFlow>
      </div>

      {/* Milestone Panel */}
      <MilestonePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        milestone={selectedMilestone}
        hasChildren={selectedHasChildren}
        isActive={selectedMilestone?.milestoneId === treeData?.activeMilestoneId}
        onRestore={handleRestore}
        onDelete={handleDelete}
        restoring={restoring}
        deleting={deleting}
      />

      {/* Project Settings */}
      <ProjectSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        projectName={projectName}
      />

      {/* Create Milestone Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Milestone</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="milestone-msg">Message</Label>
            <Input
              id="milestone-msg"
              placeholder="Describe this snapshot..."
              value={createMsg}
              onChange={(e) => setCreateMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !createMsg.trim()}>
              {creating && <IconLoader2 size={16} className="mr-2 animate-spin" />}
              Save Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
