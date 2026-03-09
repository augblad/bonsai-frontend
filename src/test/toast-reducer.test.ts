/**
 * Toast Reducer — Unit Tests
 *
 * Tests the toast notification state management reducer in isolation.
 * The reducer is a pure function, making it ideal for unit testing.
 */

import { describe, it, expect } from 'vitest';
import { reducer } from '@/hooks/use-toast';

type State = { toasts: any[] };

function createState(toasts: any[] = []): State {
  return { toasts };
}

function createToast(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    open: true,
    title: 'Test Toast',
    ...overrides,
  };
}

describe('Toast Reducer', () => {
  describe('ADD_TOAST', () => {
    it('should add a toast to empty state', () => {
      const state = createState();
      const toast = createToast();

      const result = reducer(state, { type: 'ADD_TOAST', toast });

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('1');
      expect(result.toasts[0].title).toBe('Test Toast');
    });

    it('should prepend new toast (most recent first)', () => {
      const state = createState([createToast({ id: '1' })]);
      const newToast = createToast({ id: '2', title: 'New Toast' });

      const result = reducer(state, { type: 'ADD_TOAST', toast: newToast });

      expect(result.toasts[0].id).toBe('2');
    });

    it('should enforce TOAST_LIMIT of 1', () => {
      const state = createState([createToast({ id: '1' })]);
      const newToast = createToast({ id: '2' });

      const result = reducer(state, { type: 'ADD_TOAST', toast: newToast });

      // TOAST_LIMIT is 1, so only the newest toast should remain
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('2');
    });
  });

  describe('UPDATE_TOAST', () => {
    it('should update an existing toast', () => {
      const state = createState([createToast({ id: '1', title: 'Old Title' })]);

      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'New Title' },
      });

      expect(result.toasts[0].title).toBe('New Title');
    });

    it('should not modify other toasts', () => {
      const state = createState([
        createToast({ id: '1', title: 'First' }),
      ]);

      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '999', title: 'Not Found' },
      });

      expect(result.toasts[0].title).toBe('First');
    });

    it('should merge properties (not replace)', () => {
      const state = createState([
        createToast({ id: '1', title: 'Title', description: 'Desc' }),
      ]);

      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', description: 'Updated Desc' },
      });

      expect(result.toasts[0].title).toBe('Title');
      expect(result.toasts[0].description).toBe('Updated Desc');
    });
  });

  describe('DISMISS_TOAST', () => {
    it('should set open to false for a specific toast', () => {
      const state = createState([createToast({ id: '1', open: true })]);

      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });

      expect(result.toasts[0].open).toBe(false);
    });

    it('should dismiss all toasts when no toastId is provided', () => {
      const state = createState([
        createToast({ id: '1', open: true }),
      ]);

      const result = reducer(state, { type: 'DISMISS_TOAST' });

      result.toasts.forEach((t: any) => {
        expect(t.open).toBe(false);
      });
    });

    it('should not modify other toasts when dismissing specific one', () => {
      // Due to TOAST_LIMIT=1, we only have 1 toast at a time
      // but the logic should still work correctly
      const state = createState([createToast({ id: '1', open: true })]);

      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '999',
      });

      expect(result.toasts[0].open).toBe(true);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('should remove a specific toast by id', () => {
      const state = createState([createToast({ id: '1' })]);

      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      });

      expect(result.toasts).toHaveLength(0);
    });

    it('should remove all toasts when no toastId is provided', () => {
      const state = createState([createToast({ id: '1' })]);

      const result = reducer(state, { type: 'REMOVE_TOAST' });

      expect(result.toasts).toHaveLength(0);
    });

    it('should not remove other toasts', () => {
      const state = createState([createToast({ id: '1' })]);

      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '999',
      });

      expect(result.toasts).toHaveLength(1);
    });
  });

  describe('State immutability', () => {
    it('should return new state object (not mutate original)', () => {
      const state = createState([createToast({ id: '1' })]);

      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });

      expect(result).not.toBe(state);
      expect(result.toasts).not.toBe(state.toasts);
    });
  });
});
