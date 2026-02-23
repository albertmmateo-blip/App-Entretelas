import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Catalogo from './Catalogo';

function Secret() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCatalogRoute = location.pathname.startsWith('/mixo/catalogo');

  if (isCatalogRoute) {
    return <Catalogo />;
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl">
        <button
          type="button"
          onClick={() => navigate('/mixo/catalogo')}
          className="flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-neutral-200 hover:border-primary hover:bg-neutral-50 transition-colors"
        >
          <span className="text-6xl mb-4">📁</span>
          <span className="text-lg font-semibold text-neutral-900">Catálogo</span>
          <span className="text-sm text-neutral-500 mt-1">Entradas</span>
        </button>
      </div>
    </div>
  );
}

export default Secret;
