import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Encargar from '../../src/renderer/pages/Encargar';

const { useCRUDMock } = vi.hoisted(() => ({
  useCRUDMock: vi.fn(),
}));

vi.mock('../../src/renderer/hooks/useCRUD', () => ({
  default: useCRUDMock,
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>;
}

function renderEncargar(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/encargar" element={<Encargar />} />
        <Route path="/encargar/nueva" element={<Encargar />} />
        <Route path="/encargar/:id" element={<Encargar />} />
        <Route path="/encargar/proveedor/nuevo" element={<Encargar />} />
        <Route path="/encargar/proveedor/:proveedorId" element={<Encargar />} />
        <Route path="/encargar/proveedor/:proveedorId/editar" element={<Encargar />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );
}

function setupCRUDMock({ proveedores = [], encargar = [] } = {}) {
  useCRUDMock.mockImplementation((moduleName) => {
    if (moduleName === 'proveedores') {
      return {
        entries: proveedores,
        loading: false,
        fetchAll: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 2, razon_social: 'Nuevo Proveedor' }),
        update: vi.fn().mockResolvedValue(true),
        delete: vi.fn().mockResolvedValue(true),
      };
    }

    if (moduleName === 'encargar') {
      return {
        entries: encargar,
        loading: false,
        fetchAll: vi.fn(),
        create: vi.fn().mockResolvedValue(true),
        update: vi.fn().mockResolvedValue(true),
        delete: vi.fn().mockResolvedValue(true),
        toggleUrgente: vi.fn().mockResolvedValue(true),
      };
    }

    return {
      entries: [],
      loading: false,
      fetchAll: vi.fn(),
      create: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
      toggleUrgente: vi.fn().mockResolvedValue(true),
    };
  });
}

describe('Encargar flow routing', () => {
  beforeEach(() => {
    useCRUDMock.mockReset();
  });

  it('renders EncargarForm on /encargar/nueva route', () => {
    setupCRUDMock({
      proveedores: [
        { id: 1, razon_social: 'Proveedor A', fecha_creacion: '2026-01-01T00:00:00.000Z' },
      ],
      encargar: [],
    });

    renderEncargar('/encargar/nueva');

    expect(screen.getByRole('heading', { name: 'Nueva entrada' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.getByTestId('location-display')).toHaveTextContent('/encargar/nueva');
  });

  it('renders ProveedorForm on /encargar/proveedor/nuevo route', () => {
    setupCRUDMock({
      proveedores: [],
      encargar: [],
    });

    renderEncargar('/encargar/proveedor/nuevo');

    expect(screen.getByRole('heading', { name: 'Nuevo proveedor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.getByTestId('location-display')).toHaveTextContent('/encargar/proveedor/nuevo');
  });

  it('renders folder shortcuts and entries list on /encargar', async () => {
    setupCRUDMock({
      proveedores: [
        { id: 1, razon_social: 'Proveedor A', fecha_creacion: '2026-01-01T00:00:00.000Z' },
        { id: 2, razon_social: 'Proveedor B', fecha_creacion: '2026-01-02T00:00:00.000Z' },
      ],
      encargar: [
        {
          id: 10,
          proveedor_id: 1,
          articulo: 'Tela Roja',
          ref_interna: 'TR-001',
          urgente: 1,
          fecha_creacion: '2026-01-03T10:00:00.000Z',
        },
        {
          id: 11,
          proveedor_id: 2,
          articulo: 'Forro Azul',
          ref_interna: 'FA-002',
          urgente: 0,
          fecha_creacion: '2026-01-04T10:00:00.000Z',
        },
      ],
    });

    renderEncargar('/encargar');

    expect(
      screen.getByRole('button', { name: 'Abrir carpeta de Proveedor A' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Abrir carpeta de Proveedor B' })
    ).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Entradas' })).toBeInTheDocument();
    expect(screen.getByText(/Tela Roja/)).toBeInTheDocument();
    expect(screen.getByText(/Forro Azul/)).toBeInTheDocument();

    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Abrir carpeta de Proveedor A' }));
    expect(screen.getByTestId('location-display')).toHaveTextContent('/encargar/proveedor/1');
  });

  it('navigates to entry detail when clicking an entry row in list', async () => {
    setupCRUDMock({
      proveedores: [
        { id: 1, razon_social: 'Proveedor A', fecha_creacion: '2026-01-01T00:00:00.000Z' },
      ],
      encargar: [
        {
          id: 15,
          proveedor_id: 1,
          articulo: 'Cremallera Negra',
          ref_interna: 'CN-015',
          urgente: 0,
          fecha_creacion: '2026-01-05T10:00:00.000Z',
        },
      ],
    });

    renderEncargar('/encargar');

    const entryRowButton = screen.getByText('Cremallera Negra').closest('button');
    expect(entryRowButton).not.toBeNull();

    const user = userEvent.setup();
    await user.click(entryRowButton);

    expect(screen.getByTestId('location-display')).toHaveTextContent('/encargar/15');
  });

  it('filters folder shortcuts and entries list by proveedor search', async () => {
    setupCRUDMock({
      proveedores: [
        { id: 1, razon_social: 'Proveedor A', fecha_creacion: '2026-01-01T00:00:00.000Z' },
        { id: 2, razon_social: 'Proveedor B', fecha_creacion: '2026-01-02T00:00:00.000Z' },
      ],
      encargar: [
        {
          id: 21,
          proveedor_id: 1,
          articulo: 'Botón Dorado',
          ref_interna: 'BD-021',
          urgente: 0,
          fecha_creacion: '2026-01-07T10:00:00.000Z',
        },
        {
          id: 22,
          proveedor_id: 2,
          articulo: 'Hilo Verde',
          ref_interna: 'HV-022',
          urgente: 0,
          fecha_creacion: '2026-01-08T10:00:00.000Z',
        },
      ],
    });

    renderEncargar('/encargar');

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Buscar proveedor...'), 'Proveedor A');

    expect(
      screen.getByRole('button', { name: 'Abrir carpeta de Proveedor A' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Abrir carpeta de Proveedor B' })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Botón Dorado/)).toBeInTheDocument();
    expect(screen.queryByText(/Hilo Verde/)).not.toBeInTheDocument();
  });

  it('shows empty entries message when folders exist without entries', () => {
    setupCRUDMock({
      proveedores: [
        { id: 1, razon_social: 'Proveedor A', fecha_creacion: '2026-01-01T00:00:00.000Z' },
      ],
      encargar: [],
    });

    renderEncargar('/encargar');

    expect(screen.getByRole('heading', { name: 'Entradas' })).toBeInTheDocument();
    expect(screen.getByText('No hay entradas para mostrar.')).toBeInTheDocument();
  });

  it('shows edit proveedor action on proveedor page and navigates to edit route', async () => {
    setupCRUDMock({
      proveedores: [
        { id: 1, razon_social: 'Proveedor A', fecha_creacion: '2026-01-01T00:00:00.000Z' },
      ],
      encargar: [
        {
          id: 31,
          proveedor_id: 1,
          articulo: 'Tela Negra',
          urgente: 0,
          fecha_creacion: '2026-01-09T10:00:00.000Z',
        },
      ],
    });

    renderEncargar('/encargar/proveedor/1');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Editar proveedor' }));

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/encargar/proveedor/1/editar'
    );
  });
});
