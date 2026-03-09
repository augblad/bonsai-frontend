/**
 * ThemeProvider — Unit Tests
 *
 * Tests the theme context provider, dark/light mode toggling,
 * and localStorage persistence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/lib/theme';
import React from 'react';

// Helper component to access and display theme context values
function ThemeConsumer() {
  const { theme, toggle } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button data-testid="toggle-btn" onClick={toggle}>
        Toggle
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark', 'light');
});

describe('ThemeProvider', () => {
  it('should default to dark theme', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });

  it('should read theme from localStorage', () => {
    localStorage.setItem('bonsai-theme', 'light');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-value').textContent).toBe('light');
  });

  it('should toggle from dark to light', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByTestId('toggle-btn').click();
    });

    expect(screen.getByTestId('theme-value').textContent).toBe('light');
  });

  it('should toggle from light to dark', () => {
    localStorage.setItem('bonsai-theme', 'light');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByTestId('toggle-btn').click();
    });

    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });

  it('should persist theme to localStorage on change', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByTestId('toggle-btn').click();
    });

    expect(localStorage.getItem('bonsai-theme')).toBe('light');
  });

  it('should apply theme class to document root', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      screen.getByTestId('toggle-btn').click();
    });

    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should remove previous theme class when toggling', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    // Initially dark
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Toggle to light
    act(() => {
      screen.getByTestId('toggle-btn').click();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});

describe('useTheme — Default Context', () => {
  it('should return default values when used outside provider', () => {
    function Consumer() {
      const { theme, toggle } = useTheme();
      return (
        <div>
          <span data-testid="default-theme">{theme}</span>
          <button data-testid="default-toggle" onClick={toggle}>
            Toggle
          </button>
        </div>
      );
    }

    render(<Consumer />);

    expect(screen.getByTestId('default-theme').textContent).toBe('dark');
    // toggle should be a no-op (default context)
    act(() => {
      screen.getByTestId('default-toggle').click();
    });
    expect(screen.getByTestId('default-theme').textContent).toBe('dark');
  });
});
