import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppLayout } from '../../src/renderer/App';
import { ToastProvider } from '../../src/renderer/context/ToastContext';

vi.mock('../../src/renderer/pages/Home', () => ({
  default: () => <h1>Home</h1>,
}));

vi.mock('../../src/renderer/pages/Urgente', () => ({
  default: () => <h1>URGENTE!</h1>,
}));

vi.mock('../../src/renderer/pages/Notas', () => ({
  default: () => <h1>Notas</h1>,
}));

vi.mock('../../src/renderer/pages/Llamar', () => ({
  default: () => <h1>Llamar</h1>,
}));

vi.mock('../../src/renderer/pages/Encargar', () => ({
  default: () => <h1>Encargar</h1>,
}));

vi.mock('../../src/renderer/pages/Stock', () => ({
  default: () => <h1>Stock</h1>,
}));

vi.mock('../../src/renderer/pages/Email', () => ({
  default: () => <h1>E-mail</h1>,
}));

vi.mock('../../src/renderer/pages/Facturas', () => ({
  default: function FacturasPageMock() {
    const location = useLocation();
    const isEditRoute = location.pathname.endsWith('/editar');
    return <h1>{isEditRoute ? 'Contabilidad Edit Route' : 'Contabilidad'}</h1>;
  },
}));

describe('App - Sidebar Navigation', () => {
  const renderLayout = (initialEntries = ['/']) =>
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <AppLayout />
        </MemoryRouter>
      </ToastProvider>
    );

  it('renders all navigation links in the correct order', () => {
    renderLayout();

    const links = screen.getAllByRole('link');

    expect(links[0]).toHaveTextContent('Home');
    expect(links[1]).toHaveTextContent('URGENTE!');
    expect(links[2]).toHaveTextContent('Notas');
    expect(links[3]).toHaveTextContent('Llamar');
    expect(links[4]).toHaveTextContent('Encargar');
    expect(links[5]).toHaveTextContent('Stock');
    expect(links[6]).toHaveTextContent('Contabilidad');
    expect(links[7]).toHaveTextContent('Guardado');
    expect(links[8]).toHaveTextContent('E-mail');
  });

  it('highlights the active route with primary color', () => {
    renderLayout(['/notas']);

    const notasLink = screen.getByRole('link', { name: /Notas/i });
    expect(notasLink).toHaveClass('active-tab');
  });

  it('highlights Home link when at root route', () => {
    renderLayout(['/']);

    const homeLink = screen.getByRole('link', { name: /Home/i });
    expect(homeLink).toHaveClass('active-tab');
  });

  it('does not highlight Home link when at non-root route', () => {
    renderLayout(['/urgente']);

    const homeLink = screen.getByRole('link', { name: /Home/i });
    expect(homeLink).not.toHaveClass('active-tab');
  });

  it('renders Home page at / route', () => {
    renderLayout(['/']);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });

  it('renders URGENTE! page at /urgente route', () => {
    renderLayout(['/urgente']);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'URGENTE!' })).toBeInTheDocument();
  });

  it('renders Notas page at /notas route', () => {
    renderLayout(['/notas']);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Notas' })).toBeInTheDocument();
  });

  it('renders Llamar page at /llamar route', () => {
    renderLayout(['/llamar']);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Llamar' })).toBeInTheDocument();
  });

  it('renders Encargar page at /encargar route', () => {
    renderLayout(['/encargar']);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Encargar' })).toBeInTheDocument();
  });

  it('renders Contabilidad page at /contabilidad route', async () => {
    renderLayout(['/contabilidad']);

    const main = screen.getByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Contabilidad' })).toBeInTheDocument();
  });

  it('renders E-mail page at /email route', () => {
    renderLayout(['/email']);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'E-mail' })).toBeInTheDocument();
  });

  it('renders Stock page at /stock route', () => {
    renderLayout(['/stock']);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Stock' })).toBeInTheDocument();
  });

  it('registers nested routes for notas module', () => {
    renderLayout(['/notas/nueva']);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Notas' })).toBeInTheDocument();
  });

  it('registers nested routes for llamar module', () => {
    renderLayout(['/llamar/123']);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Llamar' })).toBeInTheDocument();
  });

  it('registers nested routes for encargar module', () => {
    renderLayout(['/encargar/nueva']);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Encargar' })).toBeInTheDocument();
  });

  it('registers nested routes for contabilidad compra', async () => {
    renderLayout(['/contabilidad/compra']);

    const main = screen.getByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Contabilidad' })).toBeInTheDocument();
  });

  it('registers nested routes for contabilidad venta', async () => {
    renderLayout(['/contabilidad/venta/456']);

    const main = screen.getByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Contabilidad' })).toBeInTheDocument();
  });

  it('registers nested routes for contabilidad edit paths', async () => {
    const { rerender } = render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/contabilidad/compra/123/editar']}>
          <AppLayout />
        </MemoryRouter>
      </ToastProvider>
    );

    let main = screen.getByRole('main');
    expect(
      await within(main).findByRole('heading', { name: 'Contabilidad Edit Route' })
    ).toBeInTheDocument();

    rerender(
      <ToastProvider>
        <MemoryRouter initialEntries={['/contabilidad/venta/456/editar']}>
          <AppLayout />
        </MemoryRouter>
      </ToastProvider>
    );

    main = screen.getByRole('main');
    expect(
      await within(main).findByRole('heading', { name: 'Contabilidad Edit Route' })
    ).toBeInTheDocument();
  });
});
