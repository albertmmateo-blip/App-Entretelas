import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EntriesGrid, EntryCard, EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import { formatDateTime } from '../../utils/formatDateTime';
import NotasForm from './NotasForm';

function NotasList() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteNota, toggleUrgente } = useCRUD('notas');
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

  const filteredNotas = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(
      (nota) =>
        (nota.nombre && nota.nombre.toLowerCase().includes(query)) ||
        (nota.descripcion && nota.descripcion.toLowerCase().includes(query)) ||
        (nota.contacto && nota.contacto.toLowerCase().includes(query))
    );
  }, [entries, searchQuery]);

  const sortedNotas = useMemo(() => {
    return [...filteredNotas].sort((a, b) => {
      // Primary sort: urgent entries always first
      const aUrgente = a.urgente ? 1 : 0;
      const bUrgente = b.urgente ? 1 : 0;
      if (bUrgente !== aUrgente) {
        return bUrgente - aUrgente;
      }
      // Secondary sort: by creation date (newest first)
      return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
    });
  }, [filteredNotas]);

  const handleDelete = async (id) => {
    const success = await deleteNota(id);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const handleToggleUrgente = async (nota) => {
    await toggleUrgente(nota.id, !nota.urgente);
  };

  if (loading && entries.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Notas</h1>
        <button
          type="button"
          onClick={() => navigate('/notas/nueva')}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          Nueva nota
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar en notas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-search-input
          className="w-full px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Empty state */}
      {sortedNotas.length === 0 && !loading && (
        <EmptyState icon="📭" title="notas" hasSearchQuery={!!searchQuery} />
      )}

      {/* Grid */}
      {sortedNotas.length > 0 && (
        <EntriesGrid>
          {sortedNotas.map((nota) => (
            <EntryCard
              key={nota.id}
              urgente={nota.urgente}
              onClick={() => navigate(`/notas/${nota.id}`)}
              onActionClick={(e) => setMenuState({ nota, x: e.clientX, y: e.clientY })}
            >
              <h3
                className={`text-lg font-semibold mb-2 ${
                  nota.urgente ? 'text-danger' : 'text-neutral-900'
                }`}
              >
                {nota.nombre || <span className="text-neutral-400 italic">Sin nombre</span>}
              </h3>
              <div className="space-y-1 text-sm text-neutral-700">
                {nota.contacto && (
                  <div>
                    <span className="font-medium">Contacto:</span> {nota.contacto}
                  </div>
                )}
                {nota.descripcion && (
                  <div className="text-neutral-600 line-clamp-2">{nota.descripcion}</div>
                )}
                <div className="text-neutral-500">{formatDateTime(nota.fecha_creacion)}</div>
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
              navigate(`/notas/${menuState.nota.id}`);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              handleToggleUrgente(menuState.nota);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            {menuState.nota.urgente ? 'Desmarcar urgente' : 'Marcar urgente'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirm(menuState.nota);
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
          title="¿Eliminar esta nota?"
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

function Notas() {
  const { id } = useParams();

  if (id === 'nueva' || id) {
    return <NotasForm />;
  }

  return <NotasList />;
}

export default Notas;
