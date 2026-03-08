export interface ProjectSummary {
  id: string;
  name: string;
  projectPath: string;
  createdAt: string;
  lastMilestoneAt: string | null;
  milestoneCount: number;
}

export interface TreeNode {
  milestoneId: string;
  message: string;
  commitHash: string;
  branch: string;
  createdAt: string;
  children: TreeNode[];
}

export interface MilestoneRecord {
  milestoneId: string;
  message: string;
  commitHash: string;
  branch: string;
  parentMilestoneId: string | null;
  patchFiles: string[];
  createdAt: string;
}

export interface ProjectTreeResponse {
  tree: TreeNode[];
  branches: string[];
  milestones: MilestoneRecord[];
  activeMilestoneId: string | null;
}

const delay = (ms = 1500) => new Promise((r) => setTimeout(r, ms));

const eApi = (window as any).electronAPI;

// ── Mock data ──────────────────────────────────────────────

let mockProjects: ProjectSummary[] = [
  {
    id: "proj-1",
    name: "Design System v2",
    projectPath: "/Users/dev/projects/design-system-v2",
    createdAt: "2026-02-10T09:00:00Z",
    lastMilestoneAt: "2026-03-06T14:30:00Z",
    milestoneCount: 7,
  },
  {
    id: "proj-2",
    name: "Marketing Site",
    projectPath: "/Users/dev/projects/marketing-site",
    createdAt: "2026-01-15T12:00:00Z",
    lastMilestoneAt: "2026-03-05T18:00:00Z",
    milestoneCount: 4,
  },
  {
    id: "proj-3",
    name: "Mobile App Backend",
    projectPath: "/Users/dev/projects/mobile-backend",
    createdAt: "2026-03-01T08:00:00Z",
    lastMilestoneAt: null,
    milestoneCount: 1,
  },
];

let mockTreeResponse: ProjectTreeResponse = {
  tree: [
    {
      milestoneId: "ms-1",
      message: "Initial project snapshot",
      commitHash: "a1b2c3d",
      branch: "main",
      createdAt: "2026-02-10T09:05:00Z",
      children: [
        {
          milestoneId: "ms-2",
          message: "Add header component",
          commitHash: "e4f5g6h",
          branch: "main",
          createdAt: "2026-02-12T11:30:00Z",
          children: [
            {
              milestoneId: "ms-4",
              message: "Responsive layout pass",
              commitHash: "m1n2o3p",
              branch: "main",
              createdAt: "2026-02-20T16:00:00Z",
              children: [
                {
                  milestoneId: "ms-6",
                  message: "Dark mode support",
                  commitHash: "u7v8w9x",
                  branch: "main",
                  createdAt: "2026-03-04T09:00:00Z",
                  children: [
                    {
                      milestoneId: "ms-7",
                      message: "Final polish & QA",
                      commitHash: "y0z1a2b",
                      branch: "main",
                      createdAt: "2026-03-06T14:30:00Z",
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              milestoneId: "ms-5",
              message: "Experiment: sidebar nav",
              commitHash: "q4r5s6t",
              branch: "feature/sidebar",
              createdAt: "2026-02-25T10:00:00Z",
              children: [],
            },
          ],
        },
        {
          milestoneId: "ms-3",
          message: "Setup CI pipeline",
          commitHash: "i7j8k9l",
          branch: "infra",
          createdAt: "2026-02-14T08:00:00Z",
          children: [],
        },
      ],
    },
  ],
  branches: ["main", "feature/sidebar", "infra"],
  milestones: [
    { milestoneId: "ms-1", message: "Initial project snapshot", commitHash: "a1b2c3d", branch: "main", parentMilestoneId: null, patchFiles: ["snapshot.tar.zst"], createdAt: "2026-02-10T09:05:00Z" },
    { milestoneId: "ms-2", message: "Add header component", commitHash: "e4f5g6h", branch: "main", parentMilestoneId: "ms-1", patchFiles: ["header.patch", "styles.patch"], createdAt: "2026-02-12T11:30:00Z" },
    { milestoneId: "ms-3", message: "Setup CI pipeline", commitHash: "i7j8k9l", branch: "infra", parentMilestoneId: "ms-1", patchFiles: ["ci.patch"], createdAt: "2026-02-14T08:00:00Z" },
    { milestoneId: "ms-4", message: "Responsive layout pass", commitHash: "m1n2o3p", branch: "main", parentMilestoneId: "ms-2", patchFiles: ["layout.patch", "grid.patch", "media.patch"], createdAt: "2026-02-20T16:00:00Z" },
    { milestoneId: "ms-5", message: "Experiment: sidebar nav", commitHash: "q4r5s6t", branch: "feature/sidebar", parentMilestoneId: "ms-2", patchFiles: ["sidebar.patch"], createdAt: "2026-02-25T10:00:00Z" },
    { milestoneId: "ms-6", message: "Dark mode support", commitHash: "u7v8w9x", branch: "main", parentMilestoneId: "ms-4", patchFiles: ["dark-mode.patch", "tokens.patch"], createdAt: "2026-03-04T09:00:00Z" },
    { milestoneId: "ms-7", message: "Final polish & QA", commitHash: "y0z1a2b", branch: "main", parentMilestoneId: "ms-6", patchFiles: ["polish.patch"], createdAt: "2026-03-06T14:30:00Z" },
  ],
  activeMilestoneId: "ms-7",
};

function removeNodeFromTree(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes
    .filter((n) => n.milestoneId !== id)
    .map((n) => ({ ...n, children: removeNodeFromTree(n.children, id) }));
}

let nextMockId = 8;

function addChildToNode(nodes: TreeNode[], parentId: string, child: TreeNode): TreeNode[] {
  return nodes.map((n) => {
    if (n.milestoneId === parentId) {
      return { ...n, children: [...n.children, child] };
    }
    return { ...n, children: addChildToNode(n.children, parentId, child) };
  });
}

// ── API ────────────────────────────────────────────────────

export async function projectCreate(projectPath: string, name: string): Promise<{ id: string; status: "success" | "error"; error?: string }> {
  if (eApi) {
    const res = await eApi.projectCreate(projectPath, name);
    if (res.status === "success") {
      await milestoneCreateInitial(projectPath, "Initial milestone").catch(() => {});
    }
    return res;
  }
  await delay();
  if (mockProjects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return { id: "", status: "error", error: "duplicate_name" };
  }
  const id = `proj-${nextMockId++}`;
  mockProjects.push({ id, name, projectPath, createdAt: new Date().toISOString(), lastMilestoneAt: null, milestoneCount: 0 });
  return { id, status: "success" };
}

export async function projectDelete(projectPath: string): Promise<{ status: "success" | "error" }> {
  if (eApi) return eApi.projectDelete(projectPath);
  await delay(800);
  mockProjects = mockProjects.filter((p) => p.projectPath !== projectPath);
  return { status: "success" };
}

export async function projectList(): Promise<ProjectSummary[]> {
  if (eApi) return eApi.projectList();
  await delay(600);
  return [...mockProjects];
}

export async function projectTree(_projectPath: string): Promise<ProjectTreeResponse> {
  if (eApi) return eApi.projectTree(_projectPath);
  await delay();
  return JSON.parse(JSON.stringify(mockTreeResponse));
}

export async function milestoneCreateInitial(projectPath: string, message: string): Promise<{ milestoneId: string }> {
  if (eApi) return eApi.milestoneCreateInitial(projectPath, message);
  await delay();
  return { milestoneId: `ms-new-${Date.now()}` };
}

export async function milestoneCreate(_projectPath: string, _message: string): Promise<{ milestoneId: string; error?: string }> {
  if (eApi) return eApi.milestoneCreate(_projectPath, _message);
  await delay(2000);
  if (mockTreeResponse.milestones.some((m) => m.message.toLowerCase() === _message.toLowerCase())) {
    return { milestoneId: "", error: "duplicate_name" };
  }
  const newId = `ms-${nextMockId++}`;
  const activeId = mockTreeResponse.activeMilestoneId;
  const activeMilestone = mockTreeResponse.milestones.find((m) => m.milestoneId === activeId);
  const newNode: TreeNode = {
    milestoneId: newId,
    message: _message,
    commitHash: Math.random().toString(36).substring(2, 9),
    branch: activeMilestone?.branch || "main",
    createdAt: new Date().toISOString(),
    children: [],
  };
  const newRecord: MilestoneRecord = {
    milestoneId: newId,
    message: _message,
    commitHash: newNode.commitHash,
    branch: newNode.branch,
    parentMilestoneId: activeId,
    patchFiles: ["changes.patch"],
    createdAt: newNode.createdAt,
  };
  mockTreeResponse = {
    ...mockTreeResponse,
    tree: activeId ? addChildToNode(mockTreeResponse.tree, activeId, newNode) : [...mockTreeResponse.tree, newNode],
    milestones: [...mockTreeResponse.milestones, newRecord],
    activeMilestoneId: newId,
  };
  return { milestoneId: newId };
}

export async function milestoneRestore(_projectPath: string, _milestoneId: string): Promise<{ status: "success" | "error" }> {
  if (eApi) return eApi.milestoneRestore(_projectPath, _milestoneId);
  await delay();
  mockTreeResponse = { ...mockTreeResponse, activeMilestoneId: _milestoneId };
  return { status: "success" };
}

export async function milestoneDelete(_projectPath: string, _milestoneId: string): Promise<{ status: "success" | "error" }> {
  if (eApi) return eApi.milestoneDelete(_projectPath, _milestoneId);
  await delay(800);
  mockTreeResponse = {
    ...mockTreeResponse,
    tree: removeNodeFromTree(mockTreeResponse.tree, _milestoneId),
    milestones: mockTreeResponse.milestones.filter((m) => m.milestoneId !== _milestoneId),
    activeMilestoneId: mockTreeResponse.activeMilestoneId === _milestoneId ? null : mockTreeResponse.activeMilestoneId,
  };
  return { status: "success" };
}

// ── Dialogs ────────────────────────────────────────────────

export interface DialogResult {
  canceled: boolean;
  path: string | null;
}

/** Open a native directory picker. Falls back to prompt() in dev/mock mode. */
export async function openDirectory(title?: string, defaultPath?: string): Promise<DialogResult> {
  if (eApi) return eApi.openDirectory(title, defaultPath);
  // Mock fallback for dev/browser mode
  const result = window.prompt("Enter directory path:", defaultPath || "/home/user/projects");
  return { canceled: result === null, path: result };
}

/** Open a native file picker. Falls back to prompt() in dev/mock mode. */
export async function openFile(
  title?: string,
  defaultPath?: string,
  filters?: { name: string; extensions: string[] }[],
): Promise<DialogResult> {
  if (eApi) return eApi.openFile(title, defaultPath, filters);
  const result = window.prompt("Enter file path:", defaultPath || "/home/user/file.txt");
  return { canceled: result === null, path: result };
}

// ── Settings ───────────────────────────────────────────────

/** Get a single app setting by key. */
export async function settingsGet(key: string): Promise<unknown> {
  if (eApi) return eApi.settingsGet(key);
  // Dev fallback: use localStorage
  const raw = localStorage.getItem(`bonsai-setting-${key}`);
  return raw !== null ? JSON.parse(raw) : undefined;
}

/** Set a single app setting by key. */
export async function settingsSet(key: string, value: unknown): Promise<{ status: string }> {
  if (eApi) return eApi.settingsSet(key, value);
  localStorage.setItem(`bonsai-setting-${key}`, JSON.stringify(value));
  return { status: "success" };
}
