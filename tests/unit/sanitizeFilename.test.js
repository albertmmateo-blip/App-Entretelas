import { describe, it, expect } from 'vitest';

// Import the sanitizeFilename function
// Note: We need to mock electron module first
import { vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    getPath: vi.fn(() => '/mock/userdata'),
  },
  shell: {},
}));

// Now import the module with sanitizeFilename
const { sanitizeFilename } = await import('../../src/main/ipc/facturas.js');

describe('sanitizeFilename', () => {
  it('should remove special characters', () => {
    const input = 'test:file*name?.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('testfilename.pdf');
  });

  it('should replace spaces with underscores', () => {
    const input = 'test file name.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('test_file_name.pdf');
  });

  it('should convert to lowercase', () => {
    const input = 'TestFileName.PDF';
    const result = sanitizeFilename(input);
    expect(result).toBe('testfilename.pdf');
  });

  it('should remove backslashes and forward slashes', () => {
    const input = 'test\\file/name.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('testfilename.pdf');
  });

  it('should remove control characters', () => {
    const input = 'test\x00file\x1Fname.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('testfilename.pdf');
  });

  it('should handle Windows reserved names - CON', () => {
    const input = 'CON.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('con.pdf_');
  });

  it('should handle Windows reserved names - PRN', () => {
    const input = 'PRN.txt';
    const result = sanitizeFilename(input);
    expect(result).toBe('prn.txt_');
  });

  it('should handle Windows reserved names - AUX', () => {
    const input = 'aux.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('aux.pdf_');
  });

  it('should handle Windows reserved names - NUL', () => {
    const input = 'NUL.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('nul.pdf_');
  });

  it('should handle Windows reserved names - COM1', () => {
    const input = 'COM1.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('com1.pdf_');
  });

  it('should handle Windows reserved names - LPT1', () => {
    const input = 'LPT1.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('lpt1.pdf_');
  });

  it('should truncate long names to 200 characters', () => {
    const longName = 'a'.repeat(250) + '.pdf';
    const result = sanitizeFilename(longName);
    expect(result.length).toBe(200);
  });

  it('should handle empty string', () => {
    const result = sanitizeFilename('');
    expect(result).toBe('unnamed');
  });

  it('should handle null', () => {
    const result = sanitizeFilename(null);
    expect(result).toBe('unnamed');
  });

  it('should handle undefined', () => {
    const result = sanitizeFilename(undefined);
    expect(result).toBe('unnamed');
  });

  it('should handle only special characters', () => {
    const input = '***???///';
    const result = sanitizeFilename(input);
    expect(result).toBe('unnamed');
  });

  it('should handle unicode characters safely', () => {
    const input = 'test_file_ñáé.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('test_file_ñáé.pdf');
  });

  it('should handle multiple spaces', () => {
    const input = 'test    file    name.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('test_file_name.pdf');
  });

  it('should handle mixed special characters and spaces', () => {
    const input = 'Invoice #123 (Final).pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('invoice_123_final.pdf');
  });

  it('should preserve extension after sanitization', () => {
    const input = 'test:file*.PDF';
    const result = sanitizeFilename(input);
    expect(result).toBe('testfile.pdf');
  });

  it('should handle Windows reserved name without extension', () => {
    const input = 'CON';
    const result = sanitizeFilename(input);
    expect(result).toBe('con_');
  });

  it('should handle Windows reserved name case-insensitively', () => {
    const input = 'con.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('con.pdf_');
  });

  it('should handle filename with multiple dots', () => {
    const input = 'invoice.2024.03.15.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('invoice.2024.03.15.pdf');
  });
});
