import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../../src/renderer/pages/Home';
import { setupIPCMock, teardownIPCMock, mockIPCResponse } from '../helpers/ipc-mock';

function makeNota(overrides = {}) {
  return {
    id: 1,
    nombre: 'Nota test',
    descripcion: 'Descripción nota',
    contacto: 'Juan',
    urgente: 0,
    fecha_creacion: '2026-01-15T10:00:00.000Z',
    fecha_mod: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makeLlamar(overrides = {}) {
  return {
    id: 2,
    asunto: 'Llamar a proveedor',
    contacto: 'María',
    nombre: null,
    descripcion: null,
    urgente: 0,
    fecha_creacion: '2026-01-14T10:00:00.000Z',
    fecha_mod: '2026-01-14T10:00:00.000Z',
    ...overrides,
  };
}

function makeEncargar(overrides = {}) {
  return {
    id: 3,
    articulo: 'Hilo blanco',
    proveedor: 'Proveedor S.L.',
    descripcion: null,
    urgente: 0,
    fecha_creacion: '2026-01-13T10:00:00.000Z',
    fecha_mod: '2026-01-13T10:00:00.000Z',
    ...overrides,
  };
}

const successResponse = (data) => ({ success: true, data });

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe('Home page', () => {
  beforeEach(() => {
    setupIPCMock();
    mockIPCResponse('notas:getAll', successResponse([makeNota()]));
    mockIPCResponse('llamar:getAll', successResponse([makeLlamar()]));
    mockIPCResponse('encargar:getAll', successResponse([makeEncargar()]));
  });

  afterEach(() => {
    teardownIPCMock();
  });

  it('renders the top logo banner', () => {
    renderHome();
    expect(screen.getByRole('img', { name: 'Entretelar' })).toBeInTheDocument();
  });

  it('renders module quick-nav links', () => {
    renderHome();
    expect(screen.getByRole('link', { name: /URGENTE!/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Notas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Llamar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Encargar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contabilidad/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /E-mail/i })).toBeInTheDocument();
  });

  it('shows entries from all modules after loading', async () => {
    renderHome();
    await waitFor(() => {
      expect(screen.getByText('Nota test')).toBeInTheDocument();
      expect(screen.getByText('Llamar a proveedor')).toBeInTheDocument();
      expect(screen.getByText('Hilo blanco')).toBeInTheDocument();
    });
  });

  it('filters entries by search query (title match)', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText('Nota test')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(searchInput, { target: { value: 'Nota' } });

    expect(screen.getByText('Nota test')).toBeInTheDocument();
    expect(screen.queryByText('Llamar a proveedor')).not.toBeInTheDocument();
    expect(screen.queryByText('Hilo blanco')).not.toBeInTheDocument();
  });

  it('filters entries by search query (contacto match)', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText('Nota test')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(searchInput, { target: { value: 'María' } });

    expect(screen.queryByText('Nota test')).not.toBeInTheDocument();
    expect(screen.getByText('Llamar a proveedor')).toBeInTheDocument();
    expect(screen.queryByText('Hilo blanco')).not.toBeInTheDocument();
  });

  it('shows empty state when no entries match search', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText('Nota test')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(searchInput, { target: { value: 'xyznotfound' } });

    expect(screen.getByText(/No hay entradas que coincidan/i)).toBeInTheDocument();
    expect(screen.queryByText('Nota test')).not.toBeInTheDocument();
  });

  it('filters by module type', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText('Nota test')).toBeInTheDocument());

    const moduleSelect = screen.getByRole('combobox', { name: /módulo/i });
    fireEvent.change(moduleSelect, { target: { value: 'notas' } });

    expect(screen.getByText('Nota test')).toBeInTheDocument();
    expect(screen.queryByText('Llamar a proveedor')).not.toBeInTheDocument();
    expect(screen.queryByText('Hilo blanco')).not.toBeInTheDocument();
  });

  it('keeps urgent entries at the top after sort', async () => {
    mockIPCResponse(
      'notas:getAll',
      successResponse([
        makeNota({
          id: 10,
          nombre: 'Nota normal',
          urgente: 0,
          fecha_creacion: '2026-01-20T00:00:00.000Z',
        }),
        makeNota({
          id: 11,
          nombre: 'Nota urgente',
          urgente: 1,
          fecha_creacion: '2026-01-01T00:00:00.000Z',
        }),
      ])
    );
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderHome();
    await waitFor(() => expect(screen.getByText('Nota urgente')).toBeInTheDocument());

    const rows = screen.getAllByRole('row');
    // First data row (index 1, since index 0 is header)
    expect(rows[1]).toHaveTextContent('Nota urgente');
    expect(rows[2]).toHaveTextContent('Nota normal');
  });

  it('shows empty state when there are no entries at all', async () => {
    mockIPCResponse('notas:getAll', successResponse([]));
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderHome();
    await waitFor(() => expect(screen.getByText(/No hay entradas/i)).toBeInTheDocument());
  });

  it('filters urgent-only entries', async () => {
    mockIPCResponse(
      'notas:getAll',
      successResponse([
        makeNota({ id: 10, nombre: 'Nota urgente', urgente: 1 }),
        makeNota({ id: 11, nombre: 'Nota normal', urgente: 0 }),
      ])
    );
    mockIPCResponse('llamar:getAll', successResponse([]));
    mockIPCResponse('encargar:getAll', successResponse([]));

    renderHome();
    await waitFor(() => expect(screen.getByText('Nota urgente')).toBeInTheDocument());

    const urgenteSelect = screen.getByRole('combobox', { name: /urgencia/i });
    fireEvent.change(urgenteSelect, { target: { value: 'urgent' } });

    expect(screen.getByText('Nota urgente')).toBeInTheDocument();
    expect(screen.queryByText('Nota normal')).not.toBeInTheDocument();
  });

  it('handles entries with duplicate IDs across different modules without key warnings', async () => {
    // This tests the scenario where different modules have entries with the same ID
    // which was causing React key warnings
    mockIPCResponse(
      'notas:getAll',
      successResponse([
        makeNota({ id: 1, nombre: 'Nota ID 1' }),
        makeNota({ id: 2, nombre: 'Nota ID 2' }),
      ])
    );
    mockIPCResponse(
      'llamar:getAll',
      successResponse([
        makeLlamar({ id: 1, asunto: 'Llamar ID 1' }),
        makeLlamar({ id: 2, asunto: 'Llamar ID 2' }),
      ])
    );
    mockIPCResponse(
      'encargar:getAll',
      successResponse([
        makeEncargar({ id: 1, articulo: 'Encargar ID 1' }),
        makeEncargar({ id: 2, articulo: 'Encargar ID 2' }),
      ])
    );

    renderHome();
    await waitFor(() => {
      expect(screen.getByText('Nota ID 1')).toBeInTheDocument();
      expect(screen.getByText('Llamar ID 1')).toBeInTheDocument();
      expect(screen.getByText('Encargar ID 1')).toBeInTheDocument();
    });

    // All 6 entries should be visible
    expect(screen.getByText('Nota ID 1')).toBeInTheDocument();
    expect(screen.getByText('Nota ID 2')).toBeInTheDocument();
    expect(screen.getByText('Llamar ID 1')).toBeInTheDocument();
    expect(screen.getByText('Llamar ID 2')).toBeInTheDocument();
    expect(screen.getByText('Encargar ID 1')).toBeInTheDocument();
    expect(screen.getByText('Encargar ID 2')).toBeInTheDocument();
  });
});
