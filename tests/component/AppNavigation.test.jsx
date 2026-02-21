import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppLayout } from '../../src/renderer/App';

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
  it('renders all seven navigation links in the correct order', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    const links = screen.getAllByRole('link');

    expect(links[0]).toHaveTextContent('Home');
    expect(links[1]).toHaveTextContent('URGENTE!');
    expect(links[2]).toHaveTextContent('Notas');
    expect(links[3]).toHaveTextContent('Llamar');
    expect(links[4]).toHaveTextContent('Encargar');
    expect(links[5]).toHaveTextContent('Contabilidad');
    expect(links[6]).toHaveTextContent('E-mail');
  });

  it('highlights the active route with primary color', () => {
    render(
      <MemoryRouter initialEntries={['/notas']}>
        <AppLayout />
      </MemoryRouter>
    );

    const notasLink = screen.getByRole('link', { name: /Notas/i });
    expect(notasLink).toHaveClass('text-primary');
  });

  it('highlights Home link when at root route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole('link', { name: /Home/i });
    expect(homeLink).toHaveClass('text-primary');
  });

  it('does not highlight Home link when at non-root route', () => {
    render(
      <MemoryRouter initialEntries={['/urgente']}>
        <AppLayout />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole('link', { name: /Home/i });
    expect(homeLink).not.toHaveClass('text-primary');
  });

  it('renders Home page at / route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });

  it('renders URGENTE! page at /urgente route', () => {
    render(
      <MemoryRouter initialEntries={['/urgente']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'URGENTE!' })).toBeInTheDocument();
  });

  it('renders Notas page at /notas route', () => {
    render(
      <MemoryRouter initialEntries={['/notas']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Notas' })).toBeInTheDocument();
  });

  it('renders Llamar page at /llamar route', () => {
    render(
      <MemoryRouter initialEntries={['/llamar']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Llamar' })).toBeInTheDocument();
  });

  it('renders Encargar page at /encargar route', () => {
    render(
      <MemoryRouter initialEntries={['/encargar']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Encargar' })).toBeInTheDocument();
  });

  it('renders Contabilidad page at /contabilidad route', () => {
    render(
      <MemoryRouter initialEntries={['/contabilidad']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Contabilidad' })).toBeInTheDocument();
  });

  it('renders E-mail page at /email route', () => {
    render(
      <MemoryRouter initialEntries={['/email']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'E-mail' })).toBeInTheDocument();
  });

  it('registers nested routes for notas module', () => {
    render(
      <MemoryRouter initialEntries={['/notas/nueva']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Notas' })).toBeInTheDocument();
  });

  it('registers nested routes for llamar module', () => {
    render(
      <MemoryRouter initialEntries={['/llamar/123']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Llamar' })).toBeInTheDocument();
  });

  it('registers nested routes for encargar module', () => {
    render(
      <MemoryRouter initialEntries={['/encargar/nueva']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Encargar' })).toBeInTheDocument();
  });

  it('registers nested routes for contabilidad compra', () => {
    render(
      <MemoryRouter initialEntries={['/contabilidad/compra']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Contabilidad' })).toBeInTheDocument();
  });

  it('registers nested routes for contabilidad venta', () => {
    render(
      <MemoryRouter initialEntries={['/contabilidad/venta/456']}>
        <AppLayout />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Contabilidad' })).toBeInTheDocument();
  });

  it('registers nested routes for contabilidad edit paths', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/contabilidad/compra/123/editar']}>
        <AppLayout />
      </MemoryRouter>
    );

    let main = screen.getByRole('main');
    expect(
      within(main).getByRole('heading', { name: 'Contabilidad Edit Route' })
    ).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/contabilidad/venta/456/editar']}>
        <AppLayout />
      </MemoryRouter>
    );

    main = screen.getByRole('main');
    expect(
      within(main).getByRole('heading', { name: 'Contabilidad Edit Route' })
    ).toBeInTheDocument();
  });
});
