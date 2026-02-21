import { describe, it, expect } from 'vitest';
import { normalizePDFBytes } from '../../src/renderer/utils/normalizePDFBytes';

// Minimal valid PDF header bytes: %PDF-
const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const VALID_BYTES = [...PDF_HEADER, 0x31, 0x2e, 0x34]; // %PDF-1.4

describe('normalizePDFBytes', () => {
  describe('ArrayBuffer input', () => {
    it('should accept a valid ArrayBuffer', () => {
      const { buffer } = new Uint8Array(VALID_BYTES);
      const result = normalizePDFBytes(buffer);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual(VALID_BYTES);
    });

    it('should return a Uint8Array view over the ArrayBuffer', () => {
      const { buffer } = new Uint8Array(VALID_BYTES);
      const result = normalizePDFBytes(buffer);
      expect(result.byteLength).toBe(VALID_BYTES.length);
    });
  });

  describe('Uint8Array input', () => {
    it('should accept a valid Uint8Array', () => {
      const input = new Uint8Array(VALID_BYTES);
      const result = normalizePDFBytes(input);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual(VALID_BYTES);
    });

    it('should accept other typed arrays (Int8Array)', () => {
      // Int8Array is also an ArrayBufferView
      const input = new Int8Array(VALID_BYTES);
      const result = normalizePDFBytes(input);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(VALID_BYTES.length);
    });
  });

  describe('number[] input', () => {
    it('should accept a plain number array', () => {
      const result = normalizePDFBytes(VALID_BYTES);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual(VALID_BYTES);
    });
  });

  describe('serialized Buffer object input', () => {
    it('should accept { type: "Buffer", data: number[] }', () => {
      const input = { type: 'Buffer', data: VALID_BYTES };
      const result = normalizePDFBytes(input);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual(VALID_BYTES);
    });

    it('should not treat a plain object without type:"Buffer" as a Buffer', () => {
      const input = { type: 'other', data: VALID_BYTES };
      expect(() => normalizePDFBytes(input)).toThrow(/Invalid PDF byte payload/);
    });
  });

  describe('invalid inputs', () => {
    it('should throw a helpful error for null', () => {
      expect(() => normalizePDFBytes(null)).toThrow(/Invalid PDF byte payload/);
    });

    it('should throw a helpful error for undefined', () => {
      expect(() => normalizePDFBytes(undefined)).toThrow(/Invalid PDF byte payload/);
    });

    it('should throw a helpful error for a string', () => {
      expect(() => normalizePDFBytes('%PDF-1.4')).toThrow(/Invalid PDF byte payload/);
    });

    it('should throw a helpful error for a number', () => {
      expect(() => normalizePDFBytes(42)).toThrow(/Invalid PDF byte payload/);
    });

    it('should throw when payload is too short', () => {
      const shortBytes = [0x25, 0x50]; // only 2 bytes
      expect(() => normalizePDFBytes(shortBytes)).toThrow(/too short/);
    });

    it('should throw when data does not start with %PDF-', () => {
      const notPdf = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05];
      expect(() => normalizePDFBytes(notPdf)).toThrow(/%PDF-/);
    });

    it('should include the detected header in the error message', () => {
      const notPdf = [0x50, 0x4b, 0x03, 0x04, 0x00]; // PK\x03\x04 (ZIP/docx header)
      expect(() => normalizePDFBytes(notPdf)).toThrow(/PK/);
    });
  });
});
