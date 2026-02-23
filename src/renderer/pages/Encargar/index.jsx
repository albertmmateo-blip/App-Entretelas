import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EntriesGrid, EntryCard, EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import { formatDateTime } from '../../utils/formatDateTime';
import ProveedorForm from '../Facturas/ProveedorForm';
import EncargarForm from './EncargarForm';
import Catalogo from './Catalogo';

function EncargarFoldersView() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll } = useCRUD('proveedores');
  const { entries: encargarEntries, fetchAll: fetchEncargar } = useCRUD('encargar');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAll();
    fetchEncargar();
  }, [fetchAll, fetchEncargar]);

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

  const sortedProveedores = useMemo(
    () =>
      [...filteredProveedores].sort((a, b) =>
        a.razon_social.localeCompare(b.razon_social, 'es-ES')
      ),
    [filteredProveedores]
  );

  const entriesCountByProveedor = useMemo(() => {
    return encargarEntries.reduce((acc, item) => {
      if (!item.proveedor_id) return acc;
      acc[item.proveedor_id] = (acc[item.proveedor_id] || 0) + 1;
      return acc;
    }, {});
  }, [encargarEntries]);

  const proveedoresById = useMemo(
    () => Object.fromEntries(entries.map((proveedor) => [proveedor.id, proveedor])),
    [entries]
  );

  const visibleProveedorIds = useMemo(
    () => new Set(sortedProveedores.map((proveedor) => proveedor.id)),
    [sortedProveedores]
  );

  const listedEncargarEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return encargarEntries
      .filter((entry) => {
        if (!entry.proveedor_id || !visibleProveedorIds.has(entry.proveedor_id)) {
          return false;
        }

        if (!query) {
          return true;
        }

        const proveedor = proveedoresById[entry.proveedor_id];

        return (
          (entry.articulo && entry.articulo.toLowerCase().includes(query)) ||
          (entry.ref_interna && entry.ref_interna.toLowerCase().includes(query)) ||
          (entry.descripcion && entry.descripcion.toLowerCase().includes(query)) ||
          (entry.ref_proveedor && entry.ref_proveedor.toLowerCase().includes(query)) ||
          (proveedor?.razon_social && proveedor.razon_social.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        const aUrgente = a.urgente ? 1 : 0;
        const bUrgente = b.urgente ? 1 : 0;
        if (bUrgente !== aUrgente) {
          return bUrgente - aUrgente;
        }

        return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
      });
  }, [encargarEntries, proveedoresById, searchQuery, visibleProveedorIds]);

  if (loading && entries.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Encargar</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/encargar/catalogo')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            📁 Catálogo
          </button>
          <button
            type="button"
            onClick={() => navigate('/encargar/proveedor/nuevo')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            + Nueva carpeta
          </button>
          <button
            type="button"
            onClick={() => navigate('/encargar/nueva')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            + Nueva entrada
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
                onClick={() => navigate(`/encargar/proveedor/${proveedor.id}`)}
                className="px-3 py-1.5 border border-neutral-200 rounded bg-white hover:border-primary hover:text-primary transition-colors text-sm text-neutral-700 flex items-center gap-3"
                aria-label={`Abrir carpeta de ${proveedor.razon_social}`}
              >
                <span className="font-medium">{`📁 ${proveedor.razon_social}`}</span>
                <span className="text-xs font-semibold text-primary whitespace-nowrap">
                  {entriesCountByProveedor[proveedor.id] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sortedProveedores.length === 0 && !loading && (
        <EmptyState icon="📁" title="proveedores" hasSearchQuery={!!searchQuery} />
      )}

      {/* Entries list below folders */}
      {sortedProveedores.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">Entradas</h2>
          {listedEncargarEntries.length === 0 ? (
            <div className="px-3 py-2 rounded border border-neutral-200 bg-white text-sm text-neutral-700">
              No hay entradas para mostrar.
            </div>
          ) : (
            <div className="rounded border border-neutral-200 bg-white divide-y divide-neutral-200">
              {listedEncargarEntries.map((encargar) => {
                const proveedor = proveedoresById[encargar.proveedor_id];

                return (
                  <button
                    key={`list-${encargar.id}`}
                    type="button"
                    onClick={() => navigate(`/encargar/${encargar.id}`)}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-neutral-900 break-words">
                          {encargar.urgente ? '🔴 ' : ''}
                          {encargar.articulo || 'Sin artículo'}
                        </div>
                        <div className="text-sm text-neutral-700 mt-0.5 break-words">
                          {proveedor?.razon_social || 'Sin proveedor'}
                          {encargar.ref_interna ? ` · Ref: ${encargar.ref_interna}` : ''}
                        </div>
                      </div>
                      <div className="text-xs text-neutral-500 whitespace-nowrap">
                        {formatDateTime(encargar.fecha_creacion)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EncargarProveedorView() {
  const navigate = useNavigate();
  const { proveedorId } = useParams();
  const parsedProveedorId = parseInt(proveedorId, 10);
  const entidadId = Number.isNaN(parsedProveedorId) ? null : parsedProveedorId;
  const { entries, loading, fetchAll, delete: deleteEncargar, toggleUrgente } = useCRUD('encargar');
  const { entries: proveedores, fetchAll: fetchProveedores } = useCRUD('proveedores');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuState, setMenuState] = useState(null);

  useEffect(() => {
    fetchAll();
    fetchProveedores();
  }, [fetchAll, fetchProveedores]);

  useEffect(() => {
    const handleClick = () => setMenuState(null);
    if (menuState) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
    return undefined;
  }, [menuState]);

  const proveedor = useMemo(
    () => (entidadId ? proveedores.find((item) => item.id === entidadId) : null),
    [entidadId, proveedores]
  );

  const filteredEncargar = useMemo(() => {
    const entriesInFolder = entries.filter((entry) => entry.proveedor_id === entidadId);
    if (!searchQuery.trim()) return entriesInFolder;

    const query = searchQuery.toLowerCase();
    return entriesInFolder.filter(
      (encargar) =>
        (encargar.articulo && encargar.articulo.toLowerCase().includes(query)) ||
        (encargar.ref_interna && encargar.ref_interna.toLowerCase().includes(query)) ||
        (encargar.descripcion && encargar.descripcion.toLowerCase().includes(query)) ||
        (encargar.ref_proveedor && encargar.ref_proveedor.toLowerCase().includes(query))
    );
  }, [entries, entidadId, searchQuery]);

  const sortedEncargar = useMemo(() => {
    return [...filteredEncargar].sort((a, b) => {
      const aUrgente = a.urgente ? 1 : 0;
      const bUrgente = b.urgente ? 1 : 0;
      if (bUrgente !== aUrgente) {
        return bUrgente - aUrgente;
      }
      return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
    });
  }, [filteredEncargar]);

  const handleDelete = async (id) => {
    const success = await deleteEncargar(id);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const handleToggleUrgente = async (encargar) => {
    await toggleUrgente(encargar.id, !encargar.urgente);
  };

  if (!entidadId) {
    return null;
  }

  if (loading && entries.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/encargar')}
            className="text-primary hover:text-primary/80 flex items-center gap-1 mb-2"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">
            {proveedor?.razon_social || `Proveedor ${entidadId}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/encargar/proveedor/${entidadId}/editar`)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Editar proveedor
          </button>
          <button
            type="button"
            onClick={() => navigate('/encargar/nueva')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            + Nueva entrada
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar en esta carpeta..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-search-input
          className="w-full px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {sortedEncargar.length === 0 && !loading && (
        <EmptyState icon="📦" title="entradas" hasSearchQuery={!!searchQuery} />
      )}

      {sortedEncargar.length > 0 && (
        <EntriesGrid>
          {sortedEncargar.map((encargar) => (
            <EntryCard
              key={encargar.id}
              urgente={encargar.urgente}
              onClick={() => navigate(`/encargar/${encargar.id}`)}
              onActionClick={(e) => setMenuState({ encargar, x: e.clientX, y: e.clientY })}
            >
              <h3
                className={`text-lg font-semibold mb-2 ${
                  encargar.urgente ? 'text-danger' : 'text-neutral-900'
                }`}
              >
                {encargar.articulo}
              </h3>
              <div className="space-y-1 text-sm text-neutral-700">
                {encargar.ref_interna && (
                  <div>
                    <span className="font-medium">Ref. Interna:</span> {encargar.ref_interna}
                  </div>
                )}
                <div className="text-neutral-500">{formatDateTime(encargar.fecha_creacion)}</div>
              </div>
            </EntryCard>
          ))}
        </EntriesGrid>
      )}

      {menuState && (
        <div
          className="fixed bg-neutral-100 border border-neutral-200 rounded-lg shadow-lg py-1 z-50"
          style={{ top: menuState.y, left: menuState.x }}
        >
          <button
            type="button"
            onClick={() => {
              navigate(`/encargar/${menuState.encargar.id}`);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              handleToggleUrgente(menuState.encargar);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            {menuState.encargar.urgente ? 'Desmarcar urgente' : 'Marcar urgente'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirm(menuState.encargar);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-danger hover:bg-danger/5"
          >
            Eliminar
          </button>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="¿Eliminar esta entrada?"
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

function Encargar() {
  const location = useLocation();
  const { id, proveedorId } = useParams();
  const isCatalogRoute = location.pathname.startsWith('/encargar/catalogo');
  const isNewEntryRoute = location.pathname === '/encargar/nueva';
  const isNewProveedorRoute = location.pathname === '/encargar/proveedor/nuevo';
  const isProveedorEditRoute = location.pathname.endsWith('/editar');

  if (isCatalogRoute) {
    return <Catalogo />;
  }

  if (location.pathname.includes('/encargar/proveedor')) {
    if (isNewProveedorRoute || (proveedorId && isProveedorEditRoute)) {
      return <ProveedorForm basePath="/encargar" showPDFSection={false} />;
    }

    if (proveedorId) {
      return <EncargarProveedorView />;
    }
  }

  if (isNewEntryRoute || id) {
    return <EncargarForm />;
  }

  return <EncargarFoldersView />;
}

export default Encargar;
