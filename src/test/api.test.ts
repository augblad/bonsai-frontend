/**
 * API Mock Mode — Unit Tests
 *
 * Tests the renderer API layer's mock/fallback behavior when
 * window.electronAPI is not available (browser dev mode).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Ensure electronAPI is not defined (mock mode)
beforeEach(() => {
  (window as any).electronAPI = undefined;
  localStorage.clear();
});

describe('API — Mock Mode', () => {
  describe('projectList', () => {
    it('should return mock projects', async () => {
      const { projectList } = await import('@/lib/api');
      const projects = await projectList();

      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
      expect(projects[0]).toHaveProperty('id');
      expect(projects[0]).toHaveProperty('name');
      expect(projects[0]).toHaveProperty('projectPath');
      expect(projects[0]).toHaveProperty('createdAt');
    });
  });

  describe('projectTree', () => {
    it('should return mock tree structure', async () => {
      const { projectTree } = await import('@/lib/api');
      const result = await projectTree('/test');

      expect(result).toHaveProperty('tree');
      expect(result).toHaveProperty('branches');
      expect(result).toHaveProperty('milestones');
      expect(result).toHaveProperty('activeMilestoneId');
      expect(Array.isArray(result.tree)).toBe(true);
      expect(Array.isArray(result.branches)).toBe(true);
      expect(Array.isArray(result.milestones)).toBe(true);
    });

    it('should have properly nested tree nodes', async () => {
      const { projectTree } = await import('@/lib/api');
      const result = await projectTree('/test');

      const root = result.tree[0];
      expect(root).toHaveProperty('milestoneId');
      expect(root).toHaveProperty('message');
      expect(root).toHaveProperty('commitHash');
      expect(root).toHaveProperty('branch');
      expect(root).toHaveProperty('children');
      expect(Array.isArray(root.children)).toBe(true);
    });

    it('should have consistent milestone records', async () => {
      const { projectTree } = await import('@/lib/api');
      const result = await projectTree('/test');

      for (const milestone of result.milestones) {
        expect(milestone).toHaveProperty('milestoneId');
        expect(milestone).toHaveProperty('message');
        expect(milestone).toHaveProperty('commitHash');
        expect(milestone).toHaveProperty('branch');
        expect(milestone).toHaveProperty('createdAt');
      }
    });
  });

  describe('settingsGet / settingsSet', () => {
    it('should return undefined for unset key', async () => {
      const { settingsGet } = await import('@/lib/api');
      const result = await settingsGet('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should persist and retrieve settings via localStorage', async () => {
      const { settingsGet, settingsSet } = await import('@/lib/api');

      await settingsSet('theme', 'dark');
      const result = await settingsGet('theme');
      expect(result).toBe('dark');
    });

    it('should handle complex values', async () => {
      const { settingsGet, settingsSet } = await import('@/lib/api');

      await settingsSet('config', { nested: true, count: 42 });
      const result = await settingsGet('config');
      expect(result).toEqual({ nested: true, count: 42 });
    });
  });

  describe('blacklistGet / blacklistSet', () => {
    it('should return empty array for unset blacklist', async () => {
      const { blacklistGet } = await import('@/lib/api');
      const result = await blacklistGet('/test');
      expect(result).toEqual([]);
    });

    it('should persist and retrieve blacklist via localStorage', async () => {
      const { blacklistGet, blacklistSet } = await import('@/lib/api');

      await blacklistSet('/test', ['node_modules', '.cache']);
      const result = await blacklistGet('/test');
      expect(result).toEqual(['node_modules', '.cache']);
    });
  });

  describe('projectGetTags / projectSetTags', () => {
    it('should return empty array for unset tags', async () => {
      const { projectGetTags } = await import('@/lib/api');
      const result = await projectGetTags('/test');
      expect(result).toEqual([]);
    });

    it('should persist and retrieve tags via localStorage', async () => {
      const { projectGetTags, projectSetTags } = await import('@/lib/api');

      const tags = [{ label: 'WIP', color: '#ff0' }];
      await projectSetTags('/test', tags);
      const result = await projectGetTags('/test');
      expect(result).toEqual(tags);
    });
  });

  describe('autoWatch mock fallbacks', () => {
    it('autoWatchStart should return success', async () => {
      const { autoWatchStart } = await import('@/lib/api');
      const result = await autoWatchStart('/test');
      expect(result.status).toBe('success');
    });

    it('autoWatchStop should return success', async () => {
      const { autoWatchStop } = await import('@/lib/api');
      const result = await autoWatchStop('/test');
      expect(result.status).toBe('success');
    });

    it('autoWatchStatus should return inactive', async () => {
      const { autoWatchStatus } = await import('@/lib/api');
      const result = await autoWatchStatus('/test');
      expect(result.active).toBe(false);
    });
  });

  describe('onAutoWatchMilestoneCreated', () => {
    it('should return a cleanup function without electronAPI', async () => {
      const { onAutoWatchMilestoneCreated } = await import('@/lib/api');
      const cleanup = onAutoWatchMilestoneCreated(() => {});
      expect(typeof cleanup).toBe('function');
      // calling cleanup should not throw
      cleanup();
    });
  });

  describe('mock fallback responses', () => {
    it('milestoneStorageSize should return zero', async () => {
      const { milestoneStorageSize } = await import('@/lib/api');
      const result = await milestoneStorageSize('/test', 'ms-1');
      expect(result.totalBytes).toBe(0);
    });

    it('milestoneTrackedFiles should return empty array', async () => {
      const { milestoneTrackedFiles } = await import('@/lib/api');
      const result = await milestoneTrackedFiles('/test', 'ms-1');
      expect(result).toEqual([]);
    });

    it('projectHasChanges should return false', async () => {
      const { projectHasChanges } = await import('@/lib/api');
      const result = await projectHasChanges('/test');
      expect(result.hasChanges).toBe(false);
    });

    it('projectStorageStats should return zeroes', async () => {
      const { projectStorageStats } = await import('@/lib/api');
      const result = await projectStorageStats('/test');
      expect(result.totalBase).toBe(0);
      expect(result.totalPatches).toBe(0);
      expect(result.milestoneCount).toBe(0);
    });
  });
});

describe('API — Type Contracts', () => {
  it('ProjectSummary should have required fields', async () => {
    const { projectList } = await import('@/lib/api');
    const projects = await projectList();

    if (projects.length > 0) {
      const p = projects[0];
      expect(typeof p.id).toBe('string');
      expect(typeof p.name).toBe('string');
      expect(typeof p.projectPath).toBe('string');
      expect(typeof p.createdAt).toBe('string');
      expect(typeof p.milestoneCount).toBe('number');
    }
  });

  it('TreeNode should have required fields', async () => {
    const { projectTree } = await import('@/lib/api');
    const result = await projectTree('/test');

    if (result.tree.length > 0) {
      const node = result.tree[0];
      expect(typeof node.milestoneId).toBe('string');
      expect(typeof node.message).toBe('string');
      expect(typeof node.commitHash).toBe('string');
      expect(typeof node.branch).toBe('string');
      expect(typeof node.createdAt).toBe('string');
      expect(Array.isArray(node.children)).toBe(true);
    }
  });
});
