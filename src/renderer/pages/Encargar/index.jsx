import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EntriesGrid, EntryCard, EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import EncargarForm from './EncargarForm';

function EncargarList() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteEncargar, toggleUrgente } = useCRUD('encargar');
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

  const filteredEncargar = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(
      (encargar) =>
        (encargar.articulo && encargar.articulo.toLowerCase().includes(query)) ||
        (encargar.ref_interna && encargar.ref_interna.toLowerCase().includes(query)) ||
        (encargar.descripcion && encargar.descripcion.toLowerCase().includes(query)) ||
        (encargar.proveedor && encargar.proveedor.toLowerCase().includes(query)) ||
        (encargar.ref_proveedor && encargar.ref_proveedor.toLowerCase().includes(query))
    );
  }, [entries, searchQuery]);

  const sortedEncargar = useMemo(() => {
    return [...filteredEncargar].sort((a, b) => {
      // Primary sort: urgent entries always first
      const aUrgente = a.urgente ? 1 : 0;
      const bUrgente = b.urgente ? 1 : 0;
      if (bUrgente !== aUrgente) {
        return bUrgente - aUrgente;
      }
      // Secondary sort: by creation date (newest first)
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

  if (loading && entries.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Encargar</h1>
        <button
          type="button"
          onClick={() => navigate('/encargar/nueva')}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          + Nueva entrada
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar en encargar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-search-input
          className="w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Empty state */}
      {sortedEncargar.length === 0 && !loading && (
        <EmptyState icon="📦" title="entradas" hasSearchQuery={!!searchQuery} />
      )}

      {/* Grid */}
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
                {encargar.proveedor && (
                  <div>
                    <span className="font-medium">Proveedor:</span> {encargar.proveedor}
                  </div>
                )}
                {encargar.ref_interna && (
                  <div>
                    <span className="font-medium">Ref. Interna:</span> {encargar.ref_interna}
                  </div>
                )}
                <div className="text-neutral-500">
                  {new Date(encargar.fecha_creacion).toLocaleDateString('es-ES')}
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

      {/* Delete confirmation */}
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
  const { id } = useParams();

  if (id === 'nueva' || id) {
    return <EncargarForm />;
  }

  return <EncargarList />;
}

export default Encargar;
