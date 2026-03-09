import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useNodes,
  useStore,
  getNodesBounds,
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
import { Kbd, KbdGroup } from "@/components/ui/kbd";
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

const MM_W = 200;
const MM_H = 150;
const MM_OFFSET_SCALE = 5;

/**
 * Overlays a rounded-corner viewport-indicator rect on top of the MiniMap.
 * Mirrors the viewBox math from ReactFlow's MiniMapComponent internals.
 */
function MinimapViewportOverlay() {
  const transform = useStore((s: any) => s.transform as [number, number, number]);
  const flowW = useStore((s: any) => s.width as number);
  const flowH = useStore((s: any) => s.height as number);
  const nodes = useNodes();

  const viewBB = {
    x: -transform[0] / transform[2],
    y: -transform[1] / transform[2],
    width: flowW / transform[2],
    height: flowH / transform[2],
  };

  // Union of node bounds and viewBB (matches ReactFlow's internal boundingRect)
  let boundingRect = viewBB;
  if (nodes.length > 0) {
    const nb = getNodesBounds(nodes);
    const x = Math.min(nb.x, viewBB.x);
    const y = Math.min(nb.y, viewBB.y);
    boundingRect = {
      x,
      y,
      width: Math.max(nb.x + nb.width, viewBB.x + viewBB.width) - x,
      height: Math.max(nb.y + nb.height, viewBB.y + viewBB.height) - y,
    };
  }

  const viewScale = Math.max(boundingRect.width / MM_W, boundingRect.height / MM_H);
  const viewWidth = viewScale * MM_W;
  const viewHeight = viewScale * MM_H;
  const offset = MM_OFFSET_SCALE * viewScale;
  const vbX = boundingRect.x - (viewWidth - boundingRect.width) / 2 - offset;
  const vbY = boundingRect.y - (viewHeight - boundingRect.height) / 2 - offset;
  const vbW = viewWidth + offset * 2;
  const vbH = viewHeight + offset * 2;

  // Corner radius scaled so it looks like ~8px on the minimap
  const r = 8 * viewScale;

  return (
    <Panel
      position="bottom-right"
      style={{ width: MM_W, height: MM_H, pointerEvents: "none", zIndex: 6 }}
    >
      <svg
        width={MM_W}
        height={MM_H}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        style={{ position: "absolute", top: 0, left: 0, overflow: "visible", pointerEvents: "none" }}
      >
        <rect
          x={viewBB.x}
          y={viewBB.y}
          width={viewBB.width}
          height={viewBB.height}
          rx={r}
          ry={r}
          fill="none"
          stroke="#4762ebde"
          strokeWidth={2 * viewScale}
          pointerEvents="none"
        />
      </svg>
    </Panel>
  );
}

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
  const [createDesc, setCreateDesc] = useState("");
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
  // Minimap setting
  const [minimapEnabled, setMinimapEnabled] = useState(false);
  // Canvas direction setting
  const [canvasDirection, setCanvasDirection] = useState<"horizontal" | "vertical">("horizontal");
  // Milestone name template
  const [milestoneTemplate, setMilestoneTemplate] = useState("");

  const [projectName, setProjectName] = useState("Project");

  // Load branch colors and minimap settings
  useEffect(() => {
    settingsGet("branchColorsEnabled").then((val) => {
      if (typeof val === "boolean") setBranchColorsEnabled(val);
    });
    settingsGet("minimapEnabled").then((val) => {
      if (typeof val === "boolean") setMinimapEnabled(val);
    });
    settingsGet("canvasDirection").then((val) => {
      if (val === "horizontal" || val === "vertical") setCanvasDirection(val);
    });
    settingsGet("milestoneNameTemplate").then((val) => {
      if (typeof val === "string") setMilestoneTemplate(val);
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
    const isVertical = canvasDirection === "vertical";
    const Y_GAP = isVertical ? 140 : 100;
    const X_GAP = isVertical ? 220 : 300;

    const saved = useSaved ? loadPositions(decodedPath) : null;

    let yCounter = 0;

    const traverse = (node: TreeNode, depth: number, parentId?: string) => {
      const defaultPos = isVertical
        ? { x: yCounter * X_GAP, y: depth * Y_GAP }
        : { x: depth * X_GAP, y: yCounter * Y_GAP };
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
          isVertical,
          onCreateMilestone: () => openCreateDialog(),
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
  }, [decodedPath, branchColorMap, canvasDirection]);

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
      const res = await milestoneCreate(decodedPath, createMsg, createDesc.trim() || undefined);
      if (res.error === "duplicate_name") {
        toast.error("A milestone with this name already exists in this project");
      } else {
        toast.success("Milestone created");
        setCreateMsg("");
        setCreateDesc("");
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
      openCreateDialog();
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

  /** Expand the milestone name template and open the dialog. */
  const openCreateDialog = useCallback(() => {
    if (milestoneTemplate) {
      const count = treeData ? treeData.milestones.length + 1 : 1;
      const expanded = milestoneTemplate
        .replace(/\{\{n\}\}/g, String(count))
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
      setCreateMsg(expanded);
    }
    setCreateOpen(true);
  }, [milestoneTemplate, treeData]);

  // Keyboard shortcuts panel
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === "m") {
        e.preventDefault();
        openCreateDialog();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchVisible(true);
        return;
      }
      if (e.key === "Escape") {
        if (searchVisible) { setSearchVisible(false); setSearchQuery(""); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "h" && !isInput) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openCreateDialog, searchVisible]);

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
        <Button size="sm" onClick={openCreateDialog}>
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
          {minimapEnabled && (
            <>
              <MiniMap
                nodeStrokeWidth={3}
                zoomable
                pannable
                nodeColor="#4762ebbe"
                nodeStrokeColor="#4763eb"
                maskColor="rgba(71,99,235,0.25)"
                style={{
                  background: "#4763eb22",
                  borderRadius: "10px",
                  border: "1.25px solid #4762eb60",
                  width: MM_W,
                  height: MM_H,
                }}
                nodeBorderRadius={8}
              />
              <MinimapViewportOverlay />
            </>
          )}
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
          <div className="py-2 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="milestone-msg">Message</Label>
              <Input
                id="milestone-msg"
                placeholder="Describe this snapshot..."
                value={createMsg}
                onChange={(e) => setCreateMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <textarea
                id="milestone-desc"
                className="w-full text-sm bg-background rounded-md px-3 py-2 border border-input resize-none min-h-[60px] focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Add more detail about what changed..."
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
              />
            </div>
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

      {/* Keyboard Shortcuts Panel */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {([
              { keys: ["Ctrl", "M"], desc: "Create new milestone" },
              { keys: ["Ctrl", "F"], desc: "Search milestones" },
              { keys: ["Escape"], desc: "Close search / panels" },
              { keys: ["Ctrl", "H"], desc: "Show this shortcut panel" },
            ] as { keys: string[]; desc: string }[]).map(({ keys, desc }) => (
              <div key={desc} className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">{desc}</span>
                <KbdGroup>
                  {keys.map((k, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground text-xs">+</span>}
                      <Kbd>{k}</Kbd>
                    </span>
                  ))}
                </KbdGroup>
              </div>
            ))}
          </div>
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
