import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import useCRUD from '../../hooks/useCRUD';
import LlamarForm from './LlamarForm';

function LlamarList() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteLlamar, toggleUrgente } = useCRUD('llamar');
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

  const filteredLlamar = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(
      (llamar) =>
        (llamar.asunto && llamar.asunto.toLowerCase().includes(query)) ||
        (llamar.contacto && llamar.contacto.toLowerCase().includes(query)) ||
        (llamar.nombre && llamar.nombre.toLowerCase().includes(query)) ||
        (llamar.descripcion && llamar.descripcion.toLowerCase().includes(query))
    );
  }, [entries, searchQuery]);

  const sortedLlamar = useMemo(() => {
    return [...filteredLlamar].sort((a, b) => {
      // Primary sort: urgent entries always first
      const aUrgente = a.urgente ? 1 : 0;
      const bUrgente = b.urgente ? 1 : 0;
      if (bUrgente !== aUrgente) {
        return bUrgente - aUrgente;
      }
      // Secondary sort: by creation date (newest first)
      return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
    });
  }, [filteredLlamar]);

  const handleDelete = async (id) => {
    const success = await deleteLlamar(id);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const handleToggleUrgente = async (llamar) => {
    await toggleUrgente(llamar.id, !llamar.urgente);
  };

  if (loading && entries.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-1/4 mb-4" />
          <div className="h-10 bg-neutral-200 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-40 bg-neutral-200 rounded" />
            <div className="h-40 bg-neutral-200 rounded" />
            <div className="h-40 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Llamar</h1>
        <button
          type="button"
          onClick={() => navigate('/llamar/nueva')}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          + Nueva entrada
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar en llamar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-search-input
          className="w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Empty state */}
      {sortedLlamar.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-6xl mb-4">📞</span>
          <h2 className="text-xl font-semibold text-neutral-700 mb-2">
            {searchQuery ? 'No se encontraron resultados' : 'Sin entradas'}
          </h2>
          <p className="text-neutral-500 mb-4">
            {searchQuery
              ? 'Prueba con otros términos de búsqueda'
              : 'No hay ninguna entrada todavía. Haz clic en "+ Nueva entrada" para añadir la primera.'}
          </p>
        </div>
      )}

      {/* Grid */}
      {sortedLlamar.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedLlamar.map((llamar) => (
            <button
              type="button"
              key={llamar.id}
              onClick={() => navigate(`/llamar/${llamar.id}`)}
              className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4 relative text-left ${
                llamar.urgente ? 'border-2 border-danger' : 'border border-neutral-200'
              }`}
            >
              {/* Urgente indicator */}
              {llamar.urgente && (
                <div className="absolute top-2 right-2">
                  <span className="text-danger font-bold text-xl" title="Urgente">
                    ⚠
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="pr-8">
                <h3
                  className={`text-lg font-semibold mb-2 ${
                    llamar.urgente ? 'text-danger' : 'text-neutral-900'
                  }`}
                >
                  {llamar.asunto}
                </h3>
                <div className="space-y-1 text-sm text-neutral-700">
                  <div>
                    <span className="font-medium">Contacto:</span> {llamar.contacto}
                  </div>
                  {llamar.nombre && (
                    <div>
                      <span className="font-medium">Nombre:</span> {llamar.nombre}
                    </div>
                  )}
                  <div className="text-neutral-500">
                    {new Date(llamar.fecha_creacion).toLocaleDateString('es-ES')}
                  </div>
                </div>
              </div>

              {/* Actions button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuState({ llamar, x: e.clientX, y: e.clientY });
                }}
                className="absolute bottom-2 right-2 text-neutral-500 hover:text-neutral-700 px-2 py-1"
                aria-label="Abrir menú de acciones"
              >
                ⋮
              </button>
            </button>
          ))}
        </div>
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
              navigate(`/llamar/${menuState.llamar.id}`);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              handleToggleUrgente(menuState.llamar);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            {menuState.llamar.urgente ? 'Desmarcar urgente' : 'Marcar urgente'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirm(menuState.llamar);
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

function Llamar() {
  const { id } = useParams();

  if (id === 'nueva' || id) {
    return <LlamarForm />;
  }

  return <LlamarList />;
}

export default Llamar;
