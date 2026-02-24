import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  const proveedoresState = [...proveedores];
  const encargarState = [...encargar];

  useCRUDMock.mockImplementation((moduleName) => {
    if (moduleName === 'proveedores') {
      return {
        entries: proveedoresState,
        loading: false,
        fetchAll: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 2, razon_social: 'Nuevo Proveedor' }),
        update: vi.fn().mockResolvedValue(true),
        delete: vi.fn().mockResolvedValue(true),
      };
    }

    if (moduleName === 'encargar') {
      return {
        entries: encargarState,
        loading: false,
        fetchAll: vi.fn(),
        create: vi.fn().mockImplementation(async (payload) => {
          const created = {
            id: Date.now(),
            fecha_creacion: '2026-01-10T10:00:00.000Z',
            ...payload,
          };
          encargarState.unshift(created);
          return created;
        }),
        update: vi.fn().mockImplementation(async (id, payload) => {
          const index = encargarState.findIndex((item) => item.id === id);
          if (index < 0) return null;
          encargarState[index] = {
            ...encargarState[index],
            ...payload,
            fecha_mod: '2026-01-11T10:00:00.000Z',
          };
          return encargarState[index];
        }),
        delete: vi.fn().mockImplementation(async (id) => {
          const index = encargarState.findIndex((item) => item.id === id);
          if (index >= 0) {
            encargarState.splice(index, 1);
          }
          return true;
        }),
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
    window.localStorage.clear();
  });

  it('renders dropdown trigger and search flow on /encargar route', async () => {
    setupCRUDMock({
      proveedores: [
        { id: 2, razon_social: 'MyC', fecha_creacion: '2026-01-01T00:00:00.000Z' },
        { id: 1, razon_social: 'JC', fecha_creacion: '2026-01-02T00:00:00.000Z' },
      ],
      encargar: [],
    });

    renderEncargar('/encargar');

    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '📁 Proveedores' }));
    const options = screen.getAllByRole('menuitem');

    expect(options[0]).toHaveTextContent('📁 JC');
    expect(options[1]).toHaveTextContent('📁 MyC');

    await user.type(screen.getByPlaceholderText('Buscar proveedor y pulsar Enter...'), 'MyC');
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Abrir carpeta de MyC' })).toBeInTheDocument();
    expect(
      screen.getByText('Haz clic para escribir una nota libre para este proveedor.')
    ).toBeInTheDocument();
  });

  it('renders ProveedorForm on /encargar/proveedor/nuevo route', () => {
    setupCRUDMock({ proveedores: [], encargar: [] });

    renderEncargar('/encargar/proveedor/nuevo');

    expect(screen.getByRole('heading', { name: 'Nuevo proveedor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.getByTestId('location-display')).toHaveTextContent('/encargar/proveedor/nuevo');
  });

  it('edits existing provider note by clicking container', async () => {
    setupCRUDMock({
      proveedores: [
        { id: 1, razon_social: 'Proveedor A', fecha_creacion: '2026-01-01T00:00:00.000Z' },
      ],
      encargar: [
        {
          id: 10,
          proveedor_id: 1,
          articulo: 'Nota Proveedor A',
          descripcion: 'Nota inicial',
          fecha_creacion: '2026-01-04T10:00:00.000Z',
        },
      ],
    });

    renderEncargar('/encargar');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '📁 Proveedores' }));
    await user.click(screen.getByRole('menuitem', { name: '📁 Proveedor A' }));

    expect(screen.getByText('Nota inicial')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /📁 Proveedor A/i }));

    const editor = screen.getByPlaceholderText('Escribe aquí la nota del proveedor...');
    await user.clear(editor);
    await user.type(editor, 'Nota actualizada');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      screen.queryByPlaceholderText('Escribe aquí la nota del proveedor...')
    ).not.toBeInTheDocument();
  });

  it('keeps multiple proveedores open at the same time', async () => {
    setupCRUDMock({
      proveedores: [
        { id: 1, razon_social: 'Proveedor A', fecha_creacion: '2026-01-01T00:00:00.000Z' },
        { id: 2, razon_social: 'Proveedor B', fecha_creacion: '2026-01-02T00:00:00.000Z' },
      ],
      encargar: [
        {
          id: 10,
          proveedor_id: 1,
          articulo: 'Nota Proveedor A',
          descripcion: 'Contenido A',
          fecha_creacion: '2026-01-09T10:00:00.000Z',
        },
        {
          id: 11,
          proveedor_id: 2,
          articulo: 'Nota Proveedor B',
          descripcion: 'Contenido B',
          fecha_creacion: '2026-01-09T11:00:00.000Z',
        },
      ],
    });

    renderEncargar('/encargar');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '📁 Proveedores' }));
    await user.click(screen.getByRole('menuitem', { name: '📁 Proveedor A' }));
    await user.click(screen.getByRole('button', { name: '📁 Proveedores' }));
    await user.click(screen.getByRole('menuitem', { name: '📁 Proveedor B' }));

    expect(screen.getByText('Contenido A')).toBeInTheDocument();
    expect(screen.getByText('Contenido B')).toBeInTheDocument();
  });

  it('keeps open notes after exiting and returning to the page', async () => {
    setupCRUDMock({
      proveedores: [
        { id: 1, razon_social: 'Proveedor A', fecha_creacion: '2026-01-01T00:00:00.000Z' },
      ],
      encargar: [
        {
          id: 21,
          proveedor_id: 1,
          articulo: 'Nota Proveedor A',
          descripcion: 'Persistente',
          fecha_creacion: '2026-01-09T10:00:00.000Z',
        },
      ],
    });

    const firstRender = renderEncargar('/encargar');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '📁 Proveedores' }));
    await user.click(screen.getByRole('menuitem', { name: '📁 Proveedor A' }));

    expect(screen.getByText('Persistente')).toBeInTheDocument();

    firstRender.unmount();
    renderEncargar('/encargar');

    expect(screen.getByText('Persistente')).toBeInTheDocument();
  });

  it('removes note card after deletion and requires reopening folder', async () => {
    setupCRUDMock({
      proveedores: [
        { id: 1, razon_social: 'Proveedor A', fecha_creacion: '2026-01-01T00:00:00.000Z' },
      ],
      encargar: [
        {
          id: 99,
          proveedor_id: 1,
          articulo: 'Nota Proveedor A',
          descripcion: 'Contenido',
          fecha_creacion: '2026-01-09T10:00:00.000Z',
        },
      ],
    });

    renderEncargar('/encargar');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '📁 Proveedores' }));
    await user.click(screen.getByRole('menuitem', { name: '📁 Proveedor A' }));
    await user.click(screen.getByRole('button', { name: /📁 Proveedor A/i }));
    await user.click(screen.getByRole('button', { name: 'Eliminar nota' }));

    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Selecciona una carpeta desde “📁 Proveedores” o busca una en la barra superior para abrir su nota.'
        )
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '📁 Proveedores' }));
    await user.click(screen.getByRole('menuitem', { name: '📁 Proveedor A' }));

    expect(screen.getByRole('button', { name: /📁 Proveedor A/i })).toBeInTheDocument();
  });
});
