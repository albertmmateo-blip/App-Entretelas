import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import PDFUploadSection from '../../components/PDFUploadSection';
import { EntriesGrid, EntryCard, EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import ProveedorForm from './ProveedorForm';

function ProveedoresListView() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteProveedor } = useCRUD('proveedores');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuState, setMenuState] = useState(null);
  const [folderCounts, setFolderCounts] = useState({});

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

  useEffect(() => {
    let cancelled = false;

    const loadFolderCounts = async () => {
      const facturasApi = window.electronAPI?.facturas;

      if (!entries.length) {
        if (!cancelled) {
          setFolderCounts({});
        }
        return;
      }

      if (!facturasApi?.getAllForEntidad) {
        if (!cancelled) {
          setFolderCounts(
            Object.fromEntries(
              entries.map((proveedor) => [proveedor.id, proveedor.facturas_count ?? 0])
            )
          );
        }
        return;
      }

      const countPairs = await Promise.all(
        entries.map(async (proveedor) => {
          const fallbackCount = proveedor.facturas_count ?? 0;
          try {
            const response = await facturasApi.getAllForEntidad({
              tipo: 'compra',
              entidadId: proveedor.id,
            });

            if (response.success) {
              return [proveedor.id, (response.data || []).length];
            }
          } catch (error) {
            return [proveedor.id, fallbackCount];
          }

          return [proveedor.id, fallbackCount];
        })
      );

      if (!cancelled) {
        setFolderCounts(Object.fromEntries(countPairs));
      }
    };

    loadFolderCounts();

    return () => {
      cancelled = true;
    };
  }, [entries]);

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
      {/* Header with actions on the right */}
      <div className="flex items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">Facturas Compra</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/facturas/compra/nuevo')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            + Nuevo Proveedor
          </button>
          <button
            type="button"
            onClick={() => navigate('/facturas')}
            className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar proveedor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-search-input
          className="w-full px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Proveedor folder shortcuts */}
      {sortedProveedores.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {sortedProveedores.map((proveedor) => (
              <button
                key={`shortcut-${proveedor.id}`}
                type="button"
                onClick={() => navigate(`/facturas/compra/${proveedor.id}`)}
                className="px-3 py-1.5 border border-neutral-200 rounded bg-white hover:border-primary hover:text-primary transition-colors text-sm text-neutral-700"
                aria-label={`Abrir carpeta de ${proveedor.razon_social}`}
              >
                {`📁 ${proveedor.razon_social}`}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <div>
                  <span className="font-medium">Facturas subidas:</span>{' '}
                  {folderCounts[proveedor.id] ?? proveedor.facturas_count ?? 0}
                </div>
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
          className="fixed bg-neutral-100 border border-neutral-200 rounded-lg shadow-lg py-1 z-50"
          style={{ top: menuState.y, left: menuState.x }}
        >
          <button
            type="button"
            onClick={() => {
              navigate(`/facturas/compra/${menuState.proveedor.id}/editar`);
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

function ProveedorPDFView() {
  const navigate = useNavigate();
  const { proveedorId } = useParams();
  const parsedId = parseInt(proveedorId, 10);
  const entidadId = Number.isNaN(parsedId) ? null : parsedId;
  const { entries, loading, fetchAll } = useCRUD('proveedores');

  useEffect(() => {
    if (entidadId && entries.length === 0) {
      fetchAll();
    }
  }, [entidadId, entries.length, fetchAll]);

  const proveedor = useMemo(
    () => (entidadId ? entries.find((item) => item.id === entidadId) : null),
    [entidadId, entries]
  );

  if (!entidadId) {
    return null;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/facturas/compra')}
            className="text-primary hover:text-primary/80 flex items-center gap-1 mb-2"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">
            {proveedor?.razon_social || 'Proveedor'}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/facturas/compra/${entidadId}/editar`)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          Editar proveedor
        </button>
      </div>

      {loading && !proveedor ? (
        <LoadingState />
      ) : (
        <PDFUploadSection
          tipo="compra"
          entidadId={entidadId}
          entidadNombre={proveedor?.razon_social || `Proveedor ${entidadId}`}
        />
      )}
    </div>
  );
}

function ProveedoresList() {
  const location = useLocation();
  const { proveedorId } = useParams();
  const isEditRoute = location.pathname.endsWith('/editar');

  if (proveedorId === 'nuevo' || (proveedorId && isEditRoute)) {
    return <ProveedorForm />;
  }

  if (proveedorId) {
    return <ProveedorPDFView />;
  }

  return <ProveedoresListView />;
}

export default ProveedoresList;
