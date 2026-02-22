import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ArreglosList from '../../src/renderer/pages/Facturas/ArreglosList';

const { useCRUDMock } = vi.hoisted(() => ({
  useCRUDMock: vi.fn(),
}));

vi.mock('../../src/renderer/hooks/useCRUD', () => ({
  default: useCRUDMock,
}));

function renderArreglos(initialEntry = '/contabilidad/arreglos') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/contabilidad/arreglos" element={<ArreglosList />} />
        <Route path="/contabilidad/arreglos/carpeta/:albaran" element={<ArreglosList />} />
        <Route path="/contabilidad/arreglos/nueva" element={<ArreglosList />} />
        <Route path="/contabilidad/arreglos/carpeta/:albaran/nueva" element={<ArreglosList />} />
        <Route path="/contabilidad/arreglos/:id" element={<ArreglosList />} />
        <Route path="/contabilidad/arreglos/carpeta/:albaran/:id" element={<ArreglosList />} />
        <Route path="/contabilidad/arreglos/resumenes-mensuales" element={<ArreglosList />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Arreglos page', () => {
  beforeEach(() => {
    useCRUDMock.mockReset();
    window.electronAPI = {
      system: {
        openArreglosMonthlySummariesWindow: vi.fn().mockResolvedValue({ success: true }),
      },
    };
  });

  it('renders list in table format with expected columns', () => {
    const fetchAll = vi.fn();

    useCRUDMock.mockReturnValue({
      entries: [
        {
          id: 1,
          albaran: 'Entretelas',
          fecha: '2026-02-22',
          numero: 'A-001',
          cliente: 'Cliente 1',
          arreglo: 'Dobladillo',
          importe: 25.5,
        },
      ],
      loading: false,
      fetchAll,
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(true),
    });

    renderArreglos();

    expect(screen.getByRole('heading', { name: 'Contabilidad Arreglos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Albarán' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fecha/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arreglo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importe' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Entretelas' })).toBeInTheDocument();
    expect(screen.getByText('A-001')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /25,50/ })).toBeInTheDocument();
    expect(fetchAll).toHaveBeenCalled();
  });

  it('validates required fields in new entry form', async () => {
    const create = vi.fn().mockResolvedValue({ success: true, data: { id: 1 } });

    useCRUDMock.mockReturnValue({
      entries: [],
      loading: false,
      fetchAll: vi.fn(),
      create,
      update: vi.fn(),
      delete: vi.fn(),
    });

    renderArreglos('/contabilidad/arreglos/nueva');

    fireEvent.change(screen.getByLabelText(/Albarán/), { target: { value: 'Isa' } });
    fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: '2026-02-22' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const requiredMessages = await screen.findAllByText('Este campo es obligatorio');
    expect(requiredMessages.length).toBeGreaterThanOrEqual(2);
    expect(create).not.toHaveBeenCalled();
  });

  it('submits a valid new arreglo entry', async () => {
    const create = vi.fn().mockResolvedValue({ success: true, data: { id: 2 } });

    useCRUDMock.mockReturnValue({
      entries: [],
      loading: false,
      fetchAll: vi.fn(),
      create,
      update: vi.fn(),
      delete: vi.fn(),
    });

    renderArreglos('/contabilidad/arreglos/nueva');

    fireEvent.change(screen.getByLabelText(/Albarán/), { target: { value: 'Loli' } });
    fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: '2026-02-22' } });
    fireEvent.change(screen.getByLabelText(/#/, { selector: 'input' }), {
      target: { value: 'A-022' },
    });
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Cliente X' } });
    fireEvent.change(screen.getByLabelText('Arreglo'), { target: { value: 'Bajo de pantalón' } });
    fireEvent.change(screen.getByLabelText('Importe *'), { target: { value: '19.95' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        albaran: 'Loli',
        fecha: '2026-02-22',
        numero: 'A-022',
        cliente: 'Cliente X',
        arreglo: 'Bajo de pantalón',
        importe: 19.95,
      });
    });
  });

  it('persists importe when user enters 6 and input blurs before save', async () => {
    const create = vi.fn().mockResolvedValue({ success: true, data: { id: 3 } });

    useCRUDMock.mockReturnValue({
      entries: [],
      loading: false,
      fetchAll: vi.fn(),
      create,
      update: vi.fn(),
      delete: vi.fn(),
    });

    renderArreglos('/contabilidad/arreglos/nueva');

    fireEvent.change(screen.getByLabelText(/Albarán/), { target: { value: 'Entretelas' } });
    fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: '2026-02-22' } });
    fireEvent.change(screen.getByLabelText(/#/, { selector: 'input' }), {
      target: { value: 'A-006' },
    });

    const importeInput = screen.getByLabelText('Importe *');
    fireEvent.change(importeInput, { target: { value: '6' } });
    fireEvent.blur(importeInput);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          importe: 6,
        })
      );
    });
  });

  it('shows folder shortcuts and filters entries by selected folder route', () => {
    useCRUDMock.mockReturnValue({
      entries: [
        {
          id: 1,
          albaran: 'Entretelas',
          fecha: '2026-03-02',
          numero: 'A-001',
          cliente: 'Cliente 1',
          arreglo: 'Dobladillo',
          importe: 25.5,
        },
        {
          id: 2,
          albaran: 'Isa',
          fecha: '2026-03-03',
          numero: 'A-002',
          cliente: 'Cliente 2',
          arreglo: 'Manga',
          importe: 15,
        },
      ],
      loading: false,
      fetchAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(true),
    });

    renderArreglos('/contabilidad/arreglos/carpeta/Isa');

    expect(screen.getByRole('button', { name: 'Entretelas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Isa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Loli' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
    expect(screen.getByText('A-002')).toBeInTheDocument();
    expect(screen.queryByText('A-001')).not.toBeInTheDocument();
  });

  it('opens monthly summaries window for all folders and current folder', async () => {
    const opener = vi.fn().mockResolvedValue({ success: true });
    window.electronAPI = {
      system: {
        openArreglosMonthlySummariesWindow: opener,
      },
    };

    useCRUDMock.mockReturnValue({
      entries: [
        {
          id: 1,
          albaran: 'Entretelas',
          fecha: '2026-03-10',
          numero: 'A-010',
          cliente: 'Cliente 1',
          arreglo: 'Arreglo 1',
          importe: 50,
        },
      ],
      loading: false,
      fetchAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(true),
    });

    const firstRender = renderArreglos('/contabilidad/arreglos');
    fireEvent.click(screen.getByRole('button', { name: 'Resumenes mensuales' }));

    await waitFor(() => {
      expect(opener).toHaveBeenCalledWith('all');
    });

    firstRender.unmount();
    opener.mockClear();
    renderArreglos('/contabilidad/arreglos/carpeta/Entretelas');
    fireEvent.click(screen.getByRole('button', { name: 'Resumenes mensuales' }));

    await waitFor(() => {
      expect(opener).toHaveBeenCalledWith('Entretelas');
    });
  });

  it('falls back to popup route when IPC opener returns failure', async () => {
    const opener = vi.fn().mockResolvedValue({ success: false });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    window.electronAPI = {
      system: {
        openArreglosMonthlySummariesWindow: opener,
      },
    };

    useCRUDMock.mockReturnValue({
      entries: [
        {
          id: 1,
          albaran: 'Entretelas',
          fecha: '2026-03-10',
          numero: 'A-010',
          cliente: 'Cliente 1',
          arreglo: 'Arreglo 1',
          importe: 50,
        },
      ],
      loading: false,
      fetchAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(true),
    });

    renderArreglos('/contabilidad/arreglos');
    fireEvent.click(screen.getByRole('button', { name: 'Resumenes mensuales' }));

    await waitFor(() => {
      expect(opener).toHaveBeenCalledWith('all');
      expect(openSpy).toHaveBeenCalledWith(
        '/#/contabilidad/arreglos/resumenes-mensuales?scope=all',
        '_blank',
        'popup=yes,width=960,height=760,resizable=yes'
      );
    });

    openSpy.mockRestore();
  });
});
