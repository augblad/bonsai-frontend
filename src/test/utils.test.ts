/**
 * cn() Utility — Unit Tests
 *
 * Tests the Tailwind class name merge utility that combines
 * clsx with tailwind-merge.
 */

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn() utility', () => {
  it('should return empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('should pass through a single class name', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('should merge multiple class names', () => {
    const result = cn('p-4', 'mt-2', 'text-sm');
    expect(result).toContain('p-4');
    expect(result).toContain('mt-2');
    expect(result).toContain('text-sm');
  });

  it('should handle conditional classes (falsy values)', () => {
    const result = cn('base', false && 'hidden', undefined, null, 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });

  it('should resolve Tailwind conflicts (last wins)', () => {
    // tailwind-merge should keep only the last conflicting class
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('should resolve conflicting text colors', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should handle object syntax', () => {
    const result = cn({ 'bg-red-500': true, 'bg-blue-500': false });
    expect(result).toBe('bg-red-500');
  });

  it('should handle array syntax', () => {
    const result = cn(['p-4', 'mt-2']);
    expect(result).toContain('p-4');
    expect(result).toContain('mt-2');
  });

  it('should merge complex combinations', () => {
    const result = cn(
      'base-class',
      { 'conditional-class': true },
      ['array-class'],
      undefined,
    );
    expect(result).toContain('base-class');
    expect(result).toContain('conditional-class');
    expect(result).toContain('array-class');
  });

  it('should not duplicate identical classes', () => {
    const result = cn('p-4', 'p-4');
    expect(result).toBe('p-4');
  });
});
