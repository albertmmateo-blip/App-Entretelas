import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProveedoresList from './ProveedoresList';
import ClientesList from './ClientesList';

function Contabilidad() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname.startsWith('/contabilidad/compra') || pathname.startsWith('/facturas/compra')) {
    return <ProveedoresList />;
  }

  if (pathname.startsWith('/contabilidad/venta') || pathname.startsWith('/facturas/venta')) {
    return <ClientesList />;
  }

  if (pathname.startsWith('/contabilidad/arreglos')) {
    return <ProveedoresList tipo="arreglos" />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Contabilidad</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <button
          onClick={() => navigate('/contabilidad/compra')}
          className="flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-neutral-200 hover:border-primary hover:bg-neutral-50 transition-colors"
          type="button"
        >
          <span className="text-6xl mb-4">📁</span>
          <span className="text-lg font-semibold text-neutral-900">Compra</span>
          <span className="text-sm text-neutral-500 mt-1">Proveedores</span>
        </button>

        <button
          onClick={() => navigate('/contabilidad/venta')}
          className="flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-neutral-200 hover:border-primary hover:bg-neutral-50 transition-colors"
          type="button"
        >
          <span className="text-6xl mb-4">📁</span>
          <span className="text-lg font-semibold text-neutral-900">Venta</span>
          <span className="text-sm text-neutral-500 mt-1">Clientes</span>
        </button>

        <button
          onClick={() => navigate('/contabilidad/arreglos')}
          className="flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-neutral-200 hover:border-primary hover:bg-neutral-50 transition-colors"
          type="button"
        >
          <span className="text-6xl mb-4">📁</span>
          <span className="text-lg font-semibold text-neutral-900">Arreglos</span>
          <span className="text-sm text-neutral-500 mt-1">Proveedores</span>
        </button>
      </div>
    </div>
  );
}

export default Contabilidad;
