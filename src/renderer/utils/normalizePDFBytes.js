/**
 * Normalizes various byte payload shapes returned by the IPC `facturas:getPDFBytes`
 * handler into a `Uint8Array` suitable for `pdfjsLib.getDocument({ data })`.
 *
 * Electron's structured-clone algorithm serializes Node.js `Buffer` objects as
 * `{ type: 'Buffer', data: number[] }`.  Without explicit normalization the
 * renderer would silently receive that plain object and `new Uint8Array(object)`
 * would produce an empty array, causing PDF.js to throw an UnknownErrorException.
 *
 * Supported input shapes for the `data` field of an IPC response:
 *   - `ArrayBuffer`               – transferred or cloned by structured-clone
 *   - `Uint8Array` / typed array  – already the right shape
 *   - `number[]`                  – plain JS array of byte values
 *   - `{ type: 'Buffer', data: number[] }` – Node.js Buffer serialized form
 *   - `{ data: number[] }`               – generic serializer wrapper
 *
 * @param {ArrayBuffer|Uint8Array|number[]|{type:'Buffer',data:number[]}} input
 *   The raw value of `response.data` from `window.electronAPI.facturas.getPDFBytes`.
 * @returns {Uint8Array} A validated `Uint8Array` whose first five bytes decode to `%PDF-`.
 * @throws {Error} If the input cannot be converted or does not start with `%PDF-`.
 */
export function normalizePDFBytes(input) {
  let uint8;

  if (input instanceof ArrayBuffer) {
    uint8 = new Uint8Array(input);
  } else if (ArrayBuffer.isView(input)) {
    // Uint8Array, Int8Array, DataView, etc.
    uint8 = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  } else if (Array.isArray(input)) {
    // Plain number[] – the safe IPC serialization form
    uint8 = new Uint8Array(input);
  } else if (
    input !== null &&
    typeof input === 'object' &&
    input.type === 'Buffer' &&
    Array.isArray(input.data)
  ) {
    // Node.js Buffer structured-cloned as { type: 'Buffer', data: number[] }
    uint8 = new Uint8Array(input.data);
  } else if (input !== null && typeof input === 'object' && Array.isArray(input.data)) {
    // Generic serializer wrapper { data: number[] }
    uint8 = new Uint8Array(input.data);
  } else {
    throw new Error(
      `Invalid PDF byte payload: expected ArrayBuffer, typed array, number[], ` +
        `or serialized Buffer object but got ${input === null ? 'null' : typeof input}`
    );
  }

  if (uint8.length < 5) {
    throw new Error(
      `Invalid PDF data: payload is too short (${uint8.length} bytes) to be a valid PDF`
    );
  }

  // Validate the canonical PDF magic bytes: %PDF-
  const header = new TextDecoder('ascii').decode(uint8.subarray(0, 5));
  if (header !== '%PDF-') {
    throw new Error(
      `Invalid PDF data: expected "%PDF-" header but detected "${header}" – ` +
        `the IPC payload may have been corrupted or is not a PDF file`
    );
  }

  return uint8;
}
