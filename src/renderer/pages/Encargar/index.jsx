import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EntriesGrid, EntryCard, EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import { formatDateTime } from '../../utils/formatDateTime';
import ProveedorForm from '../Facturas/ProveedorForm';
import EncargarForm from './EncargarForm';

function EncargarFoldersView() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteProveedor } = useCRUD('proveedores');
  const { entries: encargarEntries, fetchAll: fetchEncargar } = useCRUD('encargar');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuState, setMenuState] = useState(null);

  useEffect(() => {
    fetchAll();
    fetchEncargar();
  }, [fetchAll, fetchEncargar]);

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
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Encargar</h1>
        <div className="ml-auto flex items-center gap-2">
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
              onClick={() => navigate(`/encargar/proveedor/${proveedor.id}`)}
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
                  <span className="font-medium">Entradas:</span>{' '}
                  {entriesCountByProveedor[proveedor.id] || 0}
                </div>
                <div className="text-neutral-500">{formatDateTime(proveedor.fecha_creacion)}</div>
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
              navigate(`/encargar/proveedor/${menuState.proveedor.id}/editar`);
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
        <button
          type="button"
          onClick={() => navigate('/encargar/nueva')}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          + Nueva entrada
        </button>
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
  const isNewEntryRoute = location.pathname === '/encargar/nueva';
  const isNewProveedorRoute = location.pathname === '/encargar/proveedor/nuevo';
  const isProveedorEditRoute = location.pathname.endsWith('/editar');

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
