import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function renderProveedores(initialEntry = '/contabilidad/compra') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/contabilidad/compra" element={<ProveedoresList />} />
        <Route path="/contabilidad/compra/:proveedorId" element={<ProveedoresList />} />
        <Route path="/contabilidad/compra/:proveedorId/editar" element={<ProveedoresList />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );
}

function renderClientes(initialEntry = '/contabilidad/venta') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/contabilidad/venta" element={<ClientesList />} />
        <Route path="/contabilidad/venta/:clienteId" element={<ClientesList />} />
        <Route path="/contabilidad/venta/:clienteId/editar" element={<ClientesList />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );
}

function createFacturasApiMock({ byEntidadId = {} } = {}) {
  return {
    getAllForEntidad: vi.fn(async ({ entidadId }) => ({
      success: true,
      data: byEntidadId[entidadId] || [],
    })),
  };
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
    delete global.window.electronAPI;
  });

  it('opens proveedor PDF folder on shortcut click and not edit form', () => {
    setupCRUDMock({ proveedores: proveedoresFixture(1) });

    renderProveedores('/contabilidad/compra');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir carpeta de Proveedor 0001' }));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/contabilidad/compra/1');
    expect(screen.getByTestId('pdf-upload-section')).toHaveTextContent('compra:1:Proveedor 0001');
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });

  it('opens proveedor edit form only from proveedor detail action', () => {
    setupCRUDMock({ proveedores: proveedoresFixture(1) });

    renderProveedores('/contabilidad/compra');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir carpeta de Proveedor 0001' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar proveedor' }));

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/contabilidad/compra/1/editar'
    );
    expect(screen.getByRole('heading', { name: 'Editar proveedor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('handles invalid proveedor id route gracefully', () => {
    setupCRUDMock({ proveedores: proveedoresFixture(2) });

    renderProveedores('/contabilidad/compra/not-a-number');

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/contabilidad/compra/not-a-number'
    );
    expect(screen.queryByTestId('pdf-upload-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Editar proveedor' })).not.toBeInTheDocument();
    expect(screen.queryByText('Contabilidad Compra')).not.toBeInTheDocument();
  });

  it('renders and navigates correctly with heavy proveedores dataset', () => {
    setupCRUDMock({ proveedores: proveedoresFixture(500) });

    renderProveedores('/contabilidad/compra');

    expect(
      screen.getByRole('button', { name: 'Abrir carpeta de Proveedor 0001' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Abrir carpeta de Proveedor 0500' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir carpeta de Proveedor 0500' }));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/contabilidad/compra/500');
    expect(screen.getByTestId('pdf-upload-section')).toHaveTextContent('compra:500:Proveedor 0500');
  });

  it('opens cliente PDF folder on shortcut click and not edit form', () => {
    setupCRUDMock({ clientes: clientesFixture(1) });
    global.window.electronAPI = {
      facturas: createFacturasApiMock(),
    };

    renderClientes('/contabilidad/venta');
    const searchInput = screen.getByPlaceholderText(
      'Buscar por Razón social, Nº cliente o F26:nombre_factura...'
    );

    expect(screen.getByRole('columnheader', { name: 'Periodo' })).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Abrir carpeta de Cliente 0001' })
    ).not.toBeInTheDocument();

    fireEvent.click(searchInput);
    fireEvent.change(searchInput, {
      target: { value: 'Cliente 0001' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Abrir carpeta de Cliente 0001' }));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/contabilidad/venta/1');
    expect(screen.getByTestId('pdf-upload-section')).toHaveTextContent('venta:1:Cliente 0001');
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });

  it('opens cliente folder dropdown when clicking search input', () => {
    setupCRUDMock({ clientes: clientesFixture(2) });
    global.window.electronAPI = {
      facturas: createFacturasApiMock(),
    };

    renderClientes('/contabilidad/venta');

    fireEvent.click(
      screen.getByPlaceholderText('Buscar por Razón social, Nº cliente o F26:nombre_factura...')
    );

    expect(screen.getByRole('button', { name: 'Orden: A-Z' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Abrir carpeta de Cliente 0001' })
    ).toBeInTheDocument();
  });

  it('opens cliente edit form only from cliente detail action', () => {
    setupCRUDMock({ clientes: clientesFixture(1) });
    global.window.electronAPI = {
      facturas: createFacturasApiMock(),
    };

    renderClientes('/contabilidad/venta');
    const searchInput = screen.getByPlaceholderText(
      'Buscar por Razón social, Nº cliente o F26:nombre_factura...'
    );

    fireEvent.click(searchInput);
    fireEvent.change(searchInput, {
      target: { value: 'C-1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Abrir carpeta de Cliente 0001' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar cliente' }));

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/contabilidad/venta/1/editar'
    );
    expect(screen.getByRole('heading', { name: 'Editar cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('handles invalid cliente id route gracefully', () => {
    setupCRUDMock({ clientes: clientesFixture(2) });
    global.window.electronAPI = {
      facturas: createFacturasApiMock(),
    };

    renderClientes('/contabilidad/venta/not-a-number');

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/contabilidad/venta/not-a-number'
    );
    expect(screen.queryByTestId('pdf-upload-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Editar cliente' })).not.toBeInTheDocument();
    expect(screen.queryByText('Contabilidad Venta')).not.toBeInTheDocument();
  });

  it('filters clientes by invoice filename when using FYY command', async () => {
    setupCRUDMock({ clientes: clientesFixture(2) });
    global.window.electronAPI = {
      facturas: createFacturasApiMock({
        byEntidadId: {
          1: [
            {
              id: 101,
              entidad_id: 1,
              nombre_original: 'Factura-Especial-Alpha.pdf',
              fecha: '2026-03-10',
              fecha_subida: '2026-03-10T10:00:00.000Z',
            },
          ],
          2: [
            {
              id: 202,
              entidad_id: 2,
              nombre_original: 'Factura-Especial-Alpha.pdf',
              fecha: '2027-04-12',
              fecha_subida: '2027-04-12T10:00:00.000Z',
            },
          ],
        },
      }),
    };

    renderClientes('/contabilidad/venta');

    const searchInput = screen.getByPlaceholderText(
      'Buscar por Razón social, Nº cliente o F26:nombre_factura...'
    );

    fireEvent.click(searchInput);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Abrir carpeta de Cliente 0001' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Abrir carpeta de Cliente 0002' })
      ).toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: 'F26:Factura-Especial-Alpha' } });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Abrir carpeta de Cliente 0001' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Abrir carpeta de Cliente 0002' })
      ).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: 'F27:Factura-Especial-Alpha' } });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Abrir carpeta de Cliente 0002' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Abrir carpeta de Cliente 0001' })
      ).not.toBeInTheDocument();
    });
  });
});
