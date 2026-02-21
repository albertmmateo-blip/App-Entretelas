import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProveedoresList from './ProveedoresList';
import ClientesList from './ClientesList';

function Facturas() {
  const navigate = useNavigate();
  const isCompra = window.location.hash.includes('/facturas/compra');
  const isVenta = window.location.hash.includes('/facturas/venta');

  // Show proveedores list if on /facturas/compra route
  if (isCompra) {
    return <ProveedoresList />;
  }

  // Show clientes list if on /facturas/venta route
  if (isVenta) {
    return <ClientesList />;
  }

  // Root facturas page - show two folder icons
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Facturas</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        {/* Facturas Compra */}
        <button
          onClick={() => navigate('/facturas/compra')}
          className="flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-neutral-200 hover:border-primary hover:bg-neutral-50 transition-colors"
          type="button"
        >
          <span className="text-6xl mb-4">📁</span>
          <span className="text-lg font-semibold text-neutral-900">Facturas Compra</span>
          <span className="text-sm text-neutral-500 mt-1">Proveedores</span>
        </button>

        {/* Facturas Venta */}
        <button
          onClick={() => navigate('/facturas/venta')}
          className="flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-neutral-200 hover:border-primary hover:bg-neutral-50 transition-colors"
          type="button"
        >
          <span className="text-6xl mb-4">📁</span>
          <span className="text-lg font-semibold text-neutral-900">Facturas Venta</span>
          <span className="text-sm text-neutral-500 mt-1">Clientes</span>
        </button>
      </div>
    </div>
  );
}

export default Facturas;
