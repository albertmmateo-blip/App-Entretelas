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
        <Route path="/contabilidad/arreglos/nueva" element={<ArreglosList />} />
        <Route path="/contabilidad/arreglos/:id" element={<ArreglosList />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Arreglos page', () => {
  beforeEach(() => {
    useCRUDMock.mockReset();
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
    expect(screen.getByText('Entretelas')).toBeInTheDocument();
    expect(screen.getByText('A-001')).toBeInTheDocument();
    expect(screen.getByText(/25,50/)).toBeInTheDocument();
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
});
