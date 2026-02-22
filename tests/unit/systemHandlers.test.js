import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSystemHandlers } from '../../src/main/ipc/system';

describe('system IPC handlers', () => {
  const mockHandlers = {};
  const openExternalMock = vi.fn();
  const loadURLMock = vi.fn();
  const browserWindowCtorMock = vi.fn(function BrowserWindowMock() {
    this.loadURL = loadURLMock;
  });

  beforeEach(() => {
    Object.keys(mockHandlers).forEach((key) => delete mockHandlers[key]);
    openExternalMock.mockReset();
    loadURLMock.mockReset();
    browserWindowCtorMock.mockClear();

    registerSystemHandlers({
      ipcMain: {
        handle: vi.fn((channel, handler) => {
          mockHandlers[channel] = handler;
        }),
      },
      shell: {
        openExternal: openExternalMock,
      },
      BrowserWindow: browserWindowCtorMock,
    });
  });

  it('accepts only http/https external URLs', async () => {
    const handler = mockHandlers['system:openExternal'];

    openExternalMock.mockResolvedValueOnce(undefined);
    const success = await handler(null, 'https://example.com');
    expect(success.success).toBe(true);

    const invalid = await handler(null, 'file:///secret.txt');
    expect(invalid.success).toBe(false);
    expect(invalid.error.code).toBe('INVALID_PROTOCOL');
  });

  it('opens monthly summaries window with canonical allowed scope', async () => {
    const handler = mockHandlers['system:openArreglosMonthlySummariesWindow'];
    const event = {
      sender: {
        getURL: () => 'http://localhost:5173/#/contabilidad/arreglos',
      },
    };

    const response = await handler(event, 'Isa');

    expect(response.success).toBe(true);
    expect(browserWindowCtorMock).toHaveBeenCalledTimes(1);
    expect(loadURLMock).toHaveBeenCalledWith(
      'http://localhost:5173/#/contabilidad/arreglos/resumenes-mensuales?scope=Isa'
    );
  });

  it('normalizes unknown scope to all to avoid invalid paths', async () => {
    const handler = mockHandlers['system:openArreglosMonthlySummariesWindow'];
    const event = {
      sender: {
        getURL: () => 'http://localhost:5173/#/contabilidad/arreglos',
      },
    };

    const response = await handler(event, 'UnknownFolder');

    expect(response.success).toBe(true);
    expect(loadURLMock).toHaveBeenCalledWith(
      'http://localhost:5173/#/contabilidad/arreglos/resumenes-mensuales?scope=all'
    );
  });
});
