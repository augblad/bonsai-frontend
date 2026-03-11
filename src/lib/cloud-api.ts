/**
 * cloud-api.ts — Renderer-side wrappers for cloud IPC calls
 */

const eApi = (window as any).electronAPI;

export interface CloudUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CloudTeam {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pictureUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

export interface CloudTeamDetail {
  id: string;
  name: string;
  slug: string;
  pictureUrl: string | null;
  createdAt: string;
  members: {
    userId: string;
    role: string;
    joinedAt: string;
    user: { id: string; email: string; displayName: string; avatarUrl: string | null };
  }[];
}

export interface CloudProject {
  id: string;
  name: string;
  icon: string | null;
  teamId: string;
  isPublic: boolean;
  milestoneCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudStatus {
  loggedIn: boolean;
  user: CloudUser | null;
  serverUrl: string | null;
}

// Auth
export const cloudStatus = (): Promise<CloudStatus> => eApi.cloudStatus();
export const cloudSetServer = (url: string) => eApi.cloudSetServer(url);
export const cloudLogin = (email: string, password: string) => eApi.cloudLogin(email, password);
export const cloudRegister = (email: string, password: string, displayName: string) =>
  eApi.cloudRegister(email, password, displayName);
export const cloudLogout = () => eApi.cloudLogout();

// Teams
export const cloudListTeams = (): Promise<CloudTeam[]> => eApi.cloudListTeams();
export const cloudGetTeam = (teamId: string): Promise<CloudTeamDetail> => eApi.cloudGetTeam(teamId);
export const cloudCreateTeam = (name: string, description?: string) =>
  eApi.cloudCreateTeam(name, description);

// Projects
export const cloudListProjects = (teamId: string): Promise<CloudProject[]> =>
  eApi.cloudListProjects(teamId);
export const cloudGetProject = (projectId: string) => eApi.cloudGetProject(projectId);

// Invites
export const cloudAcceptInvite = (token: string) => eApi.cloudAcceptInvite(token);

// Notifications
export const cloudGetNotifications = (limit?: number) => eApi.cloudGetNotifications(limit);
export const cloudGetUnreadCount = (): Promise<number> => eApi.cloudGetUnreadCount();
export const cloudMarkNotificationRead = (id: string) => eApi.cloudMarkNotificationRead(id);
export const cloudMarkAllRead = () => eApi.cloudMarkAllRead();

// Clone & Sync
export const cloudCloneProject = (
  cloudProjectId: string,
  localPath: string,
): Promise<{ status: 'success' | 'error'; error?: string }> =>
  eApi.cloudCloneProject(cloudProjectId, localPath);

export const cloudSyncPush = (
  localPath: string,
): Promise<{ status: 'success' | 'skipped' | 'error'; error?: string }> =>
  eApi.cloudSyncPush(localPath);

export const cloudSyncStatus = (
  localPath: string,
): Promise<{ linked: boolean; cloudProjectId: string | null }> =>
  eApi.cloudSyncStatus(localPath);

export const cloudIsCloned = (
  cloudProjectId: string,
): Promise<{ cloned: boolean; localPath: string | null }> =>
  eApi.cloudIsCloned(cloudProjectId);

export const cloudLinkProject = (localPath: string, cloudProjectId: string) =>
  eApi.cloudLinkProject(localPath, cloudProjectId);

export const cloudGetLinks = (): Promise<Record<string, string>> =>
  eApi.cloudGetLinks();
