/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    platform: string;
    projectCreate: (projectPath: string, name: string) => Promise<unknown>;
    projectDelete: (projectPath: string) => Promise<unknown>;
    projectList: () => Promise<unknown>;
    projectTree: (projectPath: string) => Promise<unknown>;
    milestoneCreateInitial: (projectPath: string, message: string) => Promise<unknown>;
    milestoneCreate: (projectPath: string, message: string) => Promise<unknown>;
    milestoneRestore: (projectPath: string, milestoneId: string) => Promise<unknown>;
    milestoneDelete: (projectPath: string, milestoneId: string) => Promise<unknown>;
    openDirectory: (title?: string, defaultPath?: string) => Promise<string | undefined>;
    openFile: (title?: string, defaultPath?: string, filters?: { name: string; extensions: string[] }[]) => Promise<string | undefined>;
  };
}
