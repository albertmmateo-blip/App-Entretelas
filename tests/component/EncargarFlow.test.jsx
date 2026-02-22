import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
