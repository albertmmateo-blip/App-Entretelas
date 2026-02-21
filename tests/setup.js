import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

const shouldSuppressConsoleLine = (args) => {
  const text = args
    .map((value) => {
      if (value instanceof Error) return value.message;
      if (typeof value === 'string') return value;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    })
    .join(' ');

  return (
    text.includes('React Router Future Flag Warning') ||
    text.includes('not wrapped in act(...)') ||
    text.includes('Error: Test error') ||
    text.includes('Error in facturas:updatePDFMetadata:')
  );
};

beforeAll(() => {
  const originalWarn = console.warn;
  const originalError = console.error;

  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    if (shouldSuppressConsoleLine(args)) return;
    originalWarn(...args);
  });

  vi.spyOn(console, 'error').mockImplementation((...args) => {
    if (shouldSuppressConsoleLine(args)) return;
    originalError(...args);
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
