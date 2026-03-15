import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/renderer/App';
import { ToastProvider } from '../../src/renderer/context/ToastContext';

function renderApp() {
  return render(
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

afterEach(() => {
  delete global.window.electronAPI;
});

describe('App', () => {
  it('renders the application shell with sidebar and content area', () => {
    renderApp();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders the Home page by default', () => {
    renderApp();
    expect(screen.getByRole('img', { name: 'Entretelar' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('🔍 Buscar...')).toBeInTheDocument();
  });

  it('shows import visual feedback while import is running', async () => {
    const user = userEvent.setup();
    let importProgressCallback;
    let resolveImport;
    const importPromise = new Promise((resolve) => {
      resolveImport = resolve;
    });

    global.window.electronAPI = {
      window: {
        isMaximized: vi.fn().mockResolvedValue(false),
        onMaximizeChange: vi.fn(),
        minimize: vi.fn(),
        maximize: vi.fn(),
        close: vi.fn(),
      },
      data: {
        export: vi.fn().mockResolvedValue({ success: true }),
        import: vi.fn(() => importPromise),
        onExportProgress: vi.fn(() => () => {}),
        onImportProgress: vi.fn((cb) => {
          importProgressCallback = cb;
          return () => {};
        }),
      },
    };

    renderApp();

    await user.click(screen.getByRole('button', { name: 'Ayuda' }));
    await user.click(screen.getByRole('button', { name: /Importar datos/i }));
    await user.click(screen.getByRole('button', { name: 'Importar' }));

    act(() => {
      importProgressCallback?.({
        phase: 'importing',
        processedBytes: 3,
        totalBytes: 7,
        message: 'Importando documentos y adjuntos...',
      });
    });

    expect(screen.getByTestId('import-export-progress-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('import-export-progress-label')).toHaveTextContent(
      /Importando documentos y adjuntos\.\.\./i
    );

    act(() => {
      resolveImport({ success: true });
    });

    await waitFor(() => {
      expect(global.window.electronAPI.data.import).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('import-export-progress-dialog')).not.toBeInTheDocument();
      const toastTexts = screen
        .getAllByTestId('toast')
        .map((toast) => toast.textContent || '')
        .join(' ');
      expect(toastTexts).toContain('Datos importados correctamente');
    });
  });
});
