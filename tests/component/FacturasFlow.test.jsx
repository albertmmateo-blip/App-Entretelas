import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProveedoresList from '../../src/renderer/pages/Facturas/ProveedoresList';
import ClientesList from '../../src/renderer/pages/Facturas/ClientesList';

const { useCRUDMock } = vi.hoisted(() => ({
  useCRUDMock: vi.fn(),
}));

vi.mock('../../src/renderer/hooks/useCRUD', () => ({
  default: useCRUDMock,
}));

vi.mock('../../src/renderer/components/PDFUploadSection', () => ({
  default: ({ tipo, entidadId, entidadNombre }) => (
    <div data-testid="pdf-upload-section">{`${tipo}:${entidadId}:${entidadNombre}`}</div>
  ),
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

function renderProveedores(initialEntry = '/facturas/compra') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/facturas/compra" element={<ProveedoresList />} />
        <Route path="/facturas/compra/:proveedorId" element={<ProveedoresList />} />
        <Route path="/facturas/compra/:proveedorId/editar" element={<ProveedoresList />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );
}

function renderClientes(initialEntry = '/facturas/venta') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/facturas/venta" element={<ClientesList />} />
        <Route path="/facturas/venta/:clienteId" element={<ClientesList />} />
        <Route path="/facturas/venta/:clienteId/editar" element={<ClientesList />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );
}

function proveedoresFixture(count = 1) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    razon_social: `Proveedor ${String(index + 1).padStart(4, '0')}`,
    nif: `NIF-${index + 1}`,
    direccion: `Calle ${index + 1}`,
    fecha_creacion: '2026-01-01T00:00:00.000Z',
  }));
}

function clientesFixture(count = 1) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    razon_social: `Cliente ${String(index + 1).padStart(4, '0')}`,
    numero_cliente: `C-${index + 1}`,
    nif: `NIF-${index + 1}`,
    direccion: `Avenida ${index + 1}`,
    fecha_creacion: '2026-01-01T00:00:00.000Z',
  }));
}

function setupCRUDMock({ proveedores = [], clientes = [] } = {}) {
  useCRUDMock.mockImplementation((moduleName) => {
    if (moduleName === 'proveedores') {
      return {
        entries: proveedores,
        loading: false,
        fetchAll: vi.fn(),
        delete: vi.fn().mockResolvedValue(true),
        create: vi.fn().mockResolvedValue(true),
        update: vi.fn().mockResolvedValue(true),
      };
    }

    if (moduleName === 'clientes') {
      return {
        entries: clientes,
        loading: false,
        fetchAll: vi.fn(),
        delete: vi.fn().mockResolvedValue(true),
        create: vi.fn().mockResolvedValue(true),
        update: vi.fn().mockResolvedValue(true),
      };
    }

    return {
      entries: [],
      loading: false,
      fetchAll: vi.fn(),
      delete: vi.fn().mockResolvedValue(true),
      create: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockResolvedValue(true),
    };
  });
}

describe('Facturas flow routing', () => {
  beforeEach(() => {
    useCRUDMock.mockReset();
  });

  it('opens proveedor PDF folder on card click and not edit form', () => {
    setupCRUDMock({ proveedores: proveedoresFixture(1) });

    renderProveedores('/facturas/compra');

    fireEvent.click(screen.getByText('Proveedor 0001'));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/facturas/compra/1');
    expect(screen.getByTestId('pdf-upload-section')).toHaveTextContent('compra:1:Proveedor 0001');
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });

  it('opens proveedor edit form only from Editar action', () => {
    setupCRUDMock({ proveedores: proveedoresFixture(1) });

    renderProveedores('/facturas/compra');

    fireEvent.click(screen.getByLabelText('Abrir menú de acciones'));
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/facturas/compra/1/editar');
    expect(screen.getByRole('heading', { name: 'Editar proveedor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('handles invalid proveedor id route gracefully', () => {
    setupCRUDMock({ proveedores: proveedoresFixture(2) });

    renderProveedores('/facturas/compra/not-a-number');

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/facturas/compra/not-a-number'
    );
    expect(screen.queryByTestId('pdf-upload-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Editar proveedor' })).not.toBeInTheDocument();
    expect(screen.queryByText('Facturas Compra')).not.toBeInTheDocument();
  });

  it('renders and navigates correctly with heavy proveedores dataset', () => {
    setupCRUDMock({ proveedores: proveedoresFixture(500) });

    renderProveedores('/facturas/compra');

    expect(screen.getByText('Proveedor 0001')).toBeInTheDocument();
    expect(screen.getByText('Proveedor 0500')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Proveedor 0500'));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/facturas/compra/500');
    expect(screen.getByTestId('pdf-upload-section')).toHaveTextContent('compra:500:Proveedor 0500');
  });

  it('opens cliente PDF folder on card click and not edit form', () => {
    setupCRUDMock({ clientes: clientesFixture(1) });

    renderClientes('/facturas/venta');

    fireEvent.click(screen.getByText('Cliente 0001'));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/facturas/venta/1');
    expect(screen.getByTestId('pdf-upload-section')).toHaveTextContent('venta:1:Cliente 0001');
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });

  it('opens cliente edit form only from Editar action', () => {
    setupCRUDMock({ clientes: clientesFixture(1) });

    renderClientes('/facturas/venta');

    fireEvent.click(screen.getByLabelText('Abrir menú de acciones'));
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/facturas/venta/1/editar');
    expect(screen.getByRole('heading', { name: 'Editar cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('handles invalid cliente id route gracefully', () => {
    setupCRUDMock({ clientes: clientesFixture(2) });

    renderClientes('/facturas/venta/not-a-number');

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/facturas/venta/not-a-number'
    );
    expect(screen.queryByTestId('pdf-upload-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Editar cliente' })).not.toBeInTheDocument();
    expect(screen.queryByText('Facturas Venta')).not.toBeInTheDocument();
  });
});
