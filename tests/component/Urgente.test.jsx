import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Urgente from '../../src/renderer/pages/Urgente';
import { ToastProvider } from '../../src/renderer/context/ToastContext';
import { setupIPCMock, teardownIPCMock, mockIPCResponse } from '../helpers/ipc-mock';

function makeNota(overrides = {}) {
  return {
    id: 1,
    nombre: 'Nota urgente',
    descripcion: 'Descripción nota',
    contacto: 'Juan',
    urgente: 1,
    fecha_creacion: '2026-01-15T10:00:00.000Z',
    fecha_mod: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makeLlamar(overrides = {}) {
  return {
    id: 2,
    asunto: 'Llamar urgente',
    contacto: 'María',
    nombre: null,
    descripcion: null,
    urgente: 1,
    fecha_creacion: '2026-01-14T10:00:00.000Z',
    fecha_mod: '2026-01-14T10:00:00.000Z',
    ...overrides,
  };
}

function makeEncargar(overrides = {}) {
  return {
    id: 3,
    articulo: 'Hilo urgente',
    proveedor: 'Proveedor S.L.',
    descripcion: null,
    urgente: 1,
    fecha_creacion: '2026-01-13T10:00:00.000Z',
    fecha_mod: '2026-01-13T10:00:00.000Z',
    ...overrides,
  };
}

const successResponse = (data) => ({ success: true, data });

function renderUrgente() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Urgente />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Urgente page', () => {
  beforeEach(() => {
    setupIPCMock();
    mockIPCResponse('notas:getAll', successResponse([]));
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));
    mockIPCResponse(
      'notas:update',
      vi.fn(() => successResponse({ id: 1, urgente: 0 }))
    );
    mockIPCResponse(
      'llamar:update',
      vi.fn(() => successResponse({ id: 2, urgente: 0 }))
    );
    mockIPCResponse(
      'encargar:update',
      vi.fn(() => successResponse({ id: 3, urgente: 0 }))
    );
  });

  afterEach(() => {
    teardownIPCMock();
  });

  it('renders the URGENTE! heading', async () => {
    renderUrgente();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /URGENTE!/i })).toBeInTheDocument();
    });
  });

  it('shows empty state when no urgent entries exist', async () => {
    renderUrgente();
    await waitFor(() => {
      expect(screen.getByText('No hay entradas urgentes')).toBeInTheDocument();
    });
    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  it('renders urgent entries from multiple modules grouped correctly', async () => {
    mockIPCResponse('notas:getAll', successResponse([makeNota()]));
    mockIPCResponse('llamar:getAll', successResponse([makeLlamar()]));
    mockIPCResponse('encargar:getAll', successResponse([makeEncargar()]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText('Nota urgente')).toBeInTheDocument();
    });

    // Check all three modules are present
    expect(screen.getByText(/Notas \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Llamar \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Encargar \(1\)/i)).toBeInTheDocument();

    // Check all entries are present
    expect(screen.getByText('Nota urgente')).toBeInTheDocument();
    expect(screen.getByText('Llamar urgente')).toBeInTheDocument();
    expect(screen.getByText('Hilo urgente')).toBeInTheDocument();
  });

  it('filters out non-urgent entries', async () => {
    mockIPCResponse(
      'notas:getAll',
      successResponse([
        makeNota({ id: 1, nombre: 'Urgent' }),
        makeNota({ id: 2, nombre: 'Not urgent', urgente: 0 }),
      ])
    );
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });
    expect(screen.queryByText('Not urgent')).not.toBeInTheDocument();
  });

  it('sorts entries by fecha_mod descending within each group', async () => {
    mockIPCResponse(
      'notas:getAll',
      successResponse([
        makeNota({ id: 1, nombre: 'Nota nueva', fecha_mod: '2026-01-20T10:00:00.000Z' }),
        makeNota({ id: 2, nombre: 'Nota antigua', fecha_mod: '2026-01-10T10:00:00.000Z' }),
      ])
    );
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText('Nota nueva')).toBeInTheDocument();
    });

    const notasSection = screen.getByText(/Notas \(2\)/i).closest('div');
    const entries = notasSection.querySelectorAll('h3');

    expect(entries[0]).toHaveTextContent('Nota nueva');
    expect(entries[1]).toHaveTextContent('Nota antigua');
  });

  it('displays module badges and urgente indicator', async () => {
    mockIPCResponse('notas:getAll', successResponse([makeNota()]));
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText('Notas')).toBeInTheDocument();
    });

    // Check for urgente indicator (red dot)
    const urgentIndicator = screen.getByTitle('Urgente');
    expect(urgentIndicator).toHaveTextContent('●');
  });

  it('displays contact field when present', async () => {
    mockIPCResponse('notas:getAll', successResponse([makeNota({ contacto: 'Juan' })]));
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText(/Contacto: Juan/i)).toBeInTheDocument();
    });
  });

  it('displays proveedor field for encargar entries', async () => {
    mockIPCResponse('notas:getAll', successResponse([]));
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse(
      'encargar:getAll',
      successResponse([makeEncargar({ proveedor: 'Test Proveedor' })])
    );

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText(/Proveedor: Test Proveedor/i)).toBeInTheDocument();
    });
  });

  it('displays date created in Spanish locale', async () => {
    mockIPCResponse(
      'notas:getAll',
      successResponse([makeNota({ fecha_creacion: '2026-01-15T10:00:00.000Z' })])
    );
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText(/15\/1\/2026/i)).toBeInTheDocument();
    });
  });

  it('shows "Quitar urgencia" button for each entry', async () => {
    mockIPCResponse('notas:getAll', successResponse([makeNota()]));
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText('Nota urgente')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Quitar urgencia' })).toBeInTheDocument();
  });

  it('removes entry from list when "Quitar urgencia" is clicked', async () => {
    mockIPCResponse('notas:getAll', successResponse([makeNota({ id: 1, nombre: 'Nota urgente' })]));
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText('Nota urgente')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: 'Quitar urgencia' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.queryByText('Nota urgente')).not.toBeInTheDocument();
    });

    // Should show empty state after removing the only urgent entry
    expect(screen.getByText('No hay entradas urgentes')).toBeInTheDocument();
  });

  it('shows (Sin entradas urgentes) for empty module groups', async () => {
    mockIPCResponse('notas:getAll', successResponse([makeNota()]));
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText('Nota urgente')).toBeInTheDocument();
    });

    // Llamar and Encargar should show empty state
    const emptyStates = screen.getAllByText('(Sin entradas urgentes)');
    expect(emptyStates).toHaveLength(2);
  });

  // Navigation is tested indirectly through the onClick handler
  // Full integration testing would require mocking react-router-dom's useNavigate hook

  it('handles entries with missing title fields gracefully', async () => {
    mockIPCResponse('notas:getAll', successResponse([makeNota({ nombre: null })]));
    mockIPCResponse('llamar:getAll', successResponse([makeLlamar({ asunto: null })]));
    mockIPCResponse('encargar:getAll', successResponse([makeEncargar({ articulo: null })]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText('Sin nombre')).toBeInTheDocument();
    });

    expect(screen.getByText('Sin asunto')).toBeInTheDocument();
    expect(screen.getByText('Sin artículo')).toBeInTheDocument();
  });

  it('handles multiple entries from same module', async () => {
    mockIPCResponse(
      'notas:getAll',
      successResponse([
        makeNota({ id: 1, nombre: 'Nota 1' }),
        makeNota({ id: 2, nombre: 'Nota 2' }),
        makeNota({ id: 3, nombre: 'Nota 3' }),
      ])
    );
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderUrgente();

    await waitFor(() => {
      expect(screen.getByText('Nota 1')).toBeInTheDocument();
    });

    expect(screen.getByText(/Notas \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText('Nota 1')).toBeInTheDocument();
    expect(screen.getByText('Nota 2')).toBeInTheDocument();
    expect(screen.getByText('Nota 3')).toBeInTheDocument();
  });
});
