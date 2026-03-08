import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  BackgroundVariant,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Plus, Settings, Loader2, RotateCcw, Search, BarChart3 } from "lucide-react";
import {
  projectTree,
  projectList,
  milestoneCreate,
  milestoneRestore,
  milestoneDelete,
  projectHasChanges,
  projectStorageStats,
  settingsGet,
  onAutoWatchMilestoneCreated,
  type TreeNode,
  type MilestoneRecord,
  type ProjectTreeResponse,
} from "@/lib/api";
import { MilestoneNode, BRANCH_COLOR_PALETTE } from "@/components/MilestoneNode";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const nodeTypes = { milestone: MilestoneNode };

function getStorageKey(projectPath: string) {
  return `bonsai-positions-${projectPath}`;
}

function savePositions(projectPath: string, nodes: Node[]) {
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n) => {
    positions[n.id] = n.position;
  });
  localStorage.setItem(getStorageKey(projectPath), JSON.stringify(positions));
}

function loadPositions(projectPath: string): Record<string, { x: number; y: number }> | null {
  const raw = localStorage.getItem(getStorageKey(projectPath));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function ProjectWorkspaceInner() {
  const { projectPath } = useParams<{ projectPath: string }>();
  const decodedPath = decodeURIComponent(projectPath || "");
  const navigate = useNavigate();
  const { fitView, getNodes } = useReactFlow();

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
  const [branching, setBranching] = useState(false);

  // Unsaved changes warning
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmBranchOpen, setConfirmBranchOpen] = useState(false);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);

  // Storage stats
  const [statsOpen, setStatsOpen] = useState(false);
  const [storageStats, setStorageStats] = useState<{ totalBase: number; totalPatches: number; milestoneCount: number } | null>(null);

  // Branch colors setting
  const [branchColorsEnabled, setBranchColorsEnabled] = useState(false);

  const [projectName, setProjectName] = useState("Project");

  // Load branch colors setting
  useEffect(() => {
    settingsGet("branchColorsEnabled").then((val) => {
      if (typeof val === "boolean") setBranchColorsEnabled(val);
    });
  }, []);

  // Compute branch→color map
  const branchColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!branchColorsEnabled || !treeData) return map;
    const branches = treeData.branches;
    branches.forEach((b, i) => {
      map.set(b, BRANCH_COLOR_PALETTE[i % BRANCH_COLOR_PALETTE.length]);
    });
    return map;
  }, [branchColorsEnabled, treeData]);

  // Fetch actual project name from project list
  useEffect(() => {
    projectList().then((projects) => {
      const match = projects.find((p) => p.projectPath === decodedPath);
      if (match) setProjectName(match.name);
      else setProjectName(decodedPath.split("/").pop() || "Project");
    });
  }, [decodedPath]);

  const loadTree = useCallback(async () => {
    setLoading(true);
    const data = await projectTree(decodedPath);
    setTreeData(data);
    setLoading(false);
  }, [decodedPath]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Listen for auto-watch milestone creation events and refresh the tree
  useEffect(() => {
    const cleanup = onAutoWatchMilestoneCreated((eventProjectPath) => {
      if (eventProjectPath === decodedPath) {
        loadTree();
      }
    });
    return cleanup;
  }, [decodedPath, loadTree]);

  // Build default layout from tree
  const buildLayout = useCallback((data: ProjectTreeResponse, useSaved: boolean) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const Y_GAP = 100;
    const X_GAP = 300;

    const saved = useSaved ? loadPositions(decodedPath) : null;

    let yCounter = 0;

    const traverse = (node: TreeNode, depth: number, parentId?: string) => {
      const defaultPos = { x: depth * X_GAP, y: yCounter * Y_GAP };
      const position = saved?.[node.milestoneId] ?? defaultPos;
      const color = branchColorMap.get(node.branch) || null;

      newNodes.push({
        id: node.milestoneId,
        type: "milestone",
        position,
        data: {
          label: node.message,
          message: node.message,
          commitHash: node.commitHash,
          branch: node.branch,
          createdAt: node.createdAt,
          isActive: node.milestoneId === data.activeMilestoneId,
          hasChildren: node.children.length > 0,
          hasParent: !!parentId,
          tags: node.tags,
          branchColor: color,
          onCreateMilestone: () => setCreateOpen(true),
        },
      });

      if (parentId) {
        newEdges.push({
          id: `${parentId}-${node.milestoneId}`,
          source: parentId,
          target: node.milestoneId,
          type: "smoothstep",
          style: {
            stroke: color || "hsl(var(--edge-color))",
            strokeWidth: 2,
          },
          animated: node.milestoneId === data.activeMilestoneId,
        });
      }

      if (node.children.length === 0) {
        yCounter++;
      } else {
        node.children.forEach((child) => traverse(child, depth + 1, node.milestoneId));
      }
    };

    data.tree.forEach((root) => traverse(root, 0));
    return { newNodes, newEdges };
  }, [decodedPath, branchColorMap]);

  // Convert tree to React Flow nodes/edges
  useEffect(() => {
    if (!treeData) return;
    const { newNodes, newEdges } = buildLayout(treeData, true);

    // Apply search filter (dim non-matching nodes)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      for (const n of newNodes) {
        const d = n.data as any;
        const matches =
          d.message?.toLowerCase().includes(q) ||
          d.branch?.toLowerCase().includes(q) ||
          (d.tags as string[] | undefined)?.some((t: string) => t.toLowerCase().includes(q));
        if (!matches) {
          n.style = { ...n.style, opacity: 0.25 };
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [treeData, setNodes, setEdges, buildLayout, searchQuery]);

  // Save positions on drag
  const onNodeDragStop = useCallback(
    () => {
      savePositions(decodedPath, getNodes());
    },
    [decodedPath, getNodes]
  );

  // Reset layout
  const handleResetLayout = useCallback(() => {
    if (!treeData) return;
    localStorage.removeItem(getStorageKey(decodedPath));
    const { newNodes, newEdges } = buildLayout(treeData, false);
    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => fitView({ padding: 0.3 }), 50);
    toast.success("Layout reset to default");
  }, [treeData, decodedPath, buildLayout, setNodes, setEdges, fitView]);

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
      const res = await milestoneCreate(decodedPath, createMsg);
      if (res.error === "duplicate_name") {
        toast.error("A milestone with this name already exists in this project");
      } else {
        toast.success("Milestone created");
        setCreateMsg("");
        setCreateOpen(false);
        loadTree();
      }
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
        setPanelOpen(false);
        setSelectedMilestone(null);
        loadTree();
      } else {
        toast.error("Restore failed");
      }
    } finally {
      setRestoring(false);
    }
  };

  /** Check for unsaved changes before restoring. */
  const handleRestoreWithWarning = async () => {
    if (!selectedMilestone) return;
    try {
      const { hasChanges } = await projectHasChanges(decodedPath);
      if (hasChanges) {
        setConfirmRestoreOpen(true);
      } else {
        handleRestore();
      }
    } catch {
      // If check fails, proceed anyway
      handleRestore();
    }
  };

  const handleBranchFromHere = async () => {
    if (!selectedMilestone) return;
    setBranching(true);
    try {
      // First restore to that milestone
      const restoreRes = await milestoneRestore(decodedPath, selectedMilestone.milestoneId);
      if (restoreRes.status !== "success") {
        toast.error("Failed to restore before branching");
        return;
      }
      // Then open the create dialog for the new branch milestone
      setPanelOpen(false);
      setCreateOpen(true);
      loadTree();
    } catch {
      toast.error("Branch failed");
    } finally {
      setBranching(false);
    }
  };

  /** Check for unsaved changes before branching. */
  const handleBranchWithWarning = async () => {
    if (!selectedMilestone) return;
    try {
      const { hasChanges } = await projectHasChanges(decodedPath);
      if (hasChanges) {
        setConfirmBranchOpen(true);
      } else {
        handleBranchFromHere();
      }
    } catch {
      handleBranchFromHere();
    }
  };

  const handleOpenStats = async () => {
    setStatsOpen(true);
    try {
      const stats = await projectStorageStats(decodedPath);
      setStorageStats(stats);
    } catch {
      setStorageStats(null);
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

  // Keyboard shortcut: Ctrl+M to create milestone
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "m") {
        e.preventDefault();
        setCreateOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
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
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <h2 className="font-semibold text-sm">{projectName}</h2>
        {activeName && (
          <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded">
            {activeName}
          </span>
        )}
        <div className="flex-1" />
        {searchVisible && (
          <Input
            className="w-48 h-8 text-xs"
            placeholder="Search milestones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        )}
        <button
          onClick={() => { setSearchVisible(!searchVisible); if (searchVisible) setSearchQuery(""); }}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Search milestones"
        >
          <Search size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={handleOpenStats}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Storage stats"
        >
          <BarChart3 size={16} strokeWidth={1.5} />
        </button>
        <Button variant="ghost" size="sm" onClick={handleResetLayout} className="text-muted-foreground">
          <RotateCcw size={14} className="mr-1.5" strokeWidth={2} />
          Reset Layout
        </Button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings size={16} strokeWidth={1.5} />
        </button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-1.5" strokeWidth={2} />
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
          onNodeDragStop={onNodeDragStop}
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
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            style={{ background: "hsl(var(--card))" }}
          />
        </ReactFlow>
      </div>

      {/* Milestone Panel */}
      <MilestonePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        milestone={selectedMilestone}
        hasChildren={selectedHasChildren}
        isActive={selectedMilestone?.milestoneId === treeData?.activeMilestoneId}
        onRestore={handleRestoreWithWarning}
        onDelete={handleDelete}
        restoring={restoring}
        deleting={deleting}
        projectPath={decodedPath}
        onBranchFromHere={handleBranchWithWarning}
        branching={branching}
        onMilestoneUpdated={loadTree}
      />

      {/* Project Settings */}
      <ProjectSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        projectName={projectName}
        projectPath={decodedPath}
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
              onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !createMsg.trim()}>
              {creating && <Loader2 size={16} className="mr-2 animate-spin" />}
              Save Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Restore with unsaved changes */}
      <AlertDialog open={confirmRestoreOpen} onOpenChange={setConfirmRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your project. Restoring to this milestone will discard them. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmRestoreOpen(false); handleRestore(); }}>
              Restore Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Branch with unsaved changes */}
      <AlertDialog open={confirmBranchOpen} onOpenChange={setConfirmBranchOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your project. Branching from this milestone will discard them. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmBranchOpen(false); handleBranchFromHere(); }}>
              Branch Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Storage Stats Dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Storage Stats</DialogTitle>
          </DialogHeader>
          {storageStats ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Milestones</span>
                <span className="font-medium">{storageStats.milestoneCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base snapshots</span>
                <span className="font-medium">{formatBytes(storageStats.totalBase)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patches</span>
                <span className="font-medium">{formatBytes(storageStats.totalPatches)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{formatBytes(storageStats.totalBase + storageStats.totalPatches)}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ProjectWorkspace() {
  return (
    <ReactFlowProvider>
      <ProjectWorkspaceInner />
    </ReactFlowProvider>
  );
}
