import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EntriesGrid, EntryCard, EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import ProveedorForm from './ProveedorForm';

function ProveedoresListView() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteProveedor } = useCRUD('proveedores');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuState, setMenuState] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const handleClick = () => setMenuState(null);
    if (menuState) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
    return undefined;
  }, [menuState]);

  const filteredProveedores = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(
      (proveedor) =>
        (proveedor.razon_social && proveedor.razon_social.toLowerCase().includes(query)) ||
        (proveedor.direccion && proveedor.direccion.toLowerCase().includes(query)) ||
        (proveedor.nif && proveedor.nif.toLowerCase().includes(query))
    );
  }, [entries, searchQuery]);

  const sortedProveedores = useMemo(() => {
    return [...filteredProveedores].sort((a, b) => {
      return a.razon_social.localeCompare(b.razon_social, 'es-ES');
    });
  }, [filteredProveedores]);

  const handleDelete = async (id) => {
    const success = await deleteProveedor(id);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  if (loading && entries.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      {/* Header with back button */}
      <div className="flex items-center mb-4">
        <button
          type="button"
          onClick={() => navigate('/facturas')}
          className="mr-4 text-neutral-700 hover:text-neutral-900"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">Facturas Compra</h1>
        <button
          type="button"
          onClick={() => navigate('/facturas/compra/nuevo')}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          + Nuevo Proveedor
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar proveedor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-search-input
          className="w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Empty state */}
      {sortedProveedores.length === 0 && !loading && (
        <EmptyState icon="📁" title="proveedores" hasSearchQuery={!!searchQuery} />
      )}

      {/* Grid */}
      {sortedProveedores.length > 0 && (
        <EntriesGrid>
          {sortedProveedores.map((proveedor) => (
            <EntryCard
              key={proveedor.id}
              urgente={false}
              onClick={() => navigate(`/facturas/compra/${proveedor.id}`)}
              onActionClick={(e) => setMenuState({ proveedor, x: e.clientX, y: e.clientY })}
            >
              <h3 className="text-lg font-semibold mb-2 text-neutral-900">
                {proveedor.razon_social}
              </h3>
              <div className="space-y-1 text-sm text-neutral-700">
                {proveedor.nif && (
                  <div>
                    <span className="font-medium">NIF:</span> {proveedor.nif}
                  </div>
                )}
                {proveedor.direccion && (
                  <div>
                    <span className="font-medium">Dirección:</span> {proveedor.direccion}
                  </div>
                )}
                <div className="text-neutral-500">
                  {new Date(proveedor.fecha_creacion).toLocaleDateString('es-ES')}
                </div>
              </div>
            </EntryCard>
          ))}
        </EntriesGrid>
      )}

      {/* Actions menu */}
      {menuState && (
        <div
          className="fixed bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50"
          style={{ top: menuState.y, left: menuState.x }}
        >
          <button
            type="button"
            onClick={() => {
              navigate(`/facturas/compra/${menuState.proveedor.id}`);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirm(menuState.proveedor);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-danger hover:bg-danger/5"
          >
            Eliminar
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title="¿Eliminar este proveedor?"
          message="Esta acción no se puede deshacer."
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}
    </div>
  );
}

function ProveedoresList() {
  const { proveedorId } = useParams();

  if (proveedorId === 'nuevo' || proveedorId) {
    return <ProveedorForm />;
  }

  return <ProveedoresListView />;
}

export default ProveedoresList;
