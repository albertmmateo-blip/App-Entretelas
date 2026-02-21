import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Contabilidad from '../../src/renderer/pages/Facturas';

const showToastMock = vi.fn();

vi.mock('../../src/renderer/hooks/useToast', () => ({
  default: () => ({ showToast: showToastMock }),
}));

describe('Contabilidad Office home', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.window.electronAPI = {
      facturas: {
        getAllForEntidad: vi.fn(async () => ({
          success: true,
          data: [
            {
              id: 1,
              nombre_original: 'presupuesto.docx',
              ruta_relativa: 'contabilidad/presupuesto.docx',
              fecha_subida: '2026-02-21T10:00:00.000Z',
            },
          ],
        })),
        uploadPDF: vi.fn(async () => ({ success: true })),
        openStoredFile: vi.fn(async () => ({ success: true })),
        deletePDF: vi.fn(async () => ({ success: true })),
      },
    };
  });

  it('opens office file on click', async () => {
    render(
      <MemoryRouter initialEntries={['/contabilidad']}>
        <Routes>
          <Route path="/contabilidad" element={<Contabilidad />} />
        </Routes>
      </MemoryRouter>
    );

    const fileCard = await screen.findByTitle('Clic para abrir');

    fireEvent.click(fileCard);

    await waitFor(() => {
      expect(window.electronAPI.facturas.openStoredFile).toHaveBeenCalledWith(
        'contabilidad/presupuesto.docx'
      );
    });
  });

  it('deletes office file from card action', async () => {
    render(
      <MemoryRouter initialEntries={['/contabilidad']}>
        <Routes>
          <Route path="/contabilidad" element={<Contabilidad />} />
        </Routes>
      </MemoryRouter>
    );

    const deleteButton = await screen.findByRole('button', {
      name: /eliminar presupuesto\.docx/i,
    });

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.electronAPI.facturas.deletePDF).toHaveBeenCalledWith(1);
    });
  });
});
