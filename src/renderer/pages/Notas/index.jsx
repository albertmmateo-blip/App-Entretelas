import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useNotasStore from '../../store/notas';
import useToast from '../../hooks/useToast';
import NotasForm from './NotasForm';
import ConfirmDialog from '../../components/ConfirmDialog';

function NotasList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { notas, loading, fetchAll, delete: deleteNota, toggleUrgente } = useNotasStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('fecha_creacion');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [contextMenu, setContextMenu] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const ITEMS_PER_PAGE = 100;

  useEffect(() => {
    fetchAll(showToast);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and sort notas
  const filteredAndSortedNotas = useMemo(() => {
    let filtered = notas;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = notas.filter(
        (nota) =>
          (nota.nombre && nota.nombre.toLowerCase().includes(query)) ||
          (nota.descripcion && nota.descripcion.toLowerCase().includes(query)) ||
          (nota.contacto && nota.contacto.toLowerCase().includes(query))
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null values
      if (aVal === null) aVal = '';
      if (bVal === null) bVal = '';

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });

    return sorted;
  }, [notas, searchQuery, sortField, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(filteredAndSortedNotas.length / ITEMS_PER_PAGE);
  const paginatedNotas = filteredAndSortedNotas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleContextMenu = (e, nota) => {
    e.preventDefault();
    setContextMenu({ nota, x: e.clientX, y: e.clientY });
  };

  const handleDelete = async (id) => {
    const success = await deleteNota(id, showToast);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const handleToggleUrgente = async (nota) => {
    await toggleUrgente(nota.id, !nota.urgente, showToast);
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
    return undefined;
  }, [contextMenu]);

  if (loading && notas.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-1/4 mb-4" />
          <div className="h-10 bg-neutral-200 rounded mb-4" />
          <div className="space-y-2">
            <div className="h-12 bg-neutral-200 rounded" />
            <div className="h-12 bg-neutral-200 rounded" />
            <div className="h-12 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    );
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
          + Nueva nota
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
          className="w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Empty state */}
      {filteredAndSortedNotas.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-6xl mb-4">📭</span>
          <h2 className="text-xl font-semibold text-neutral-700 mb-2">
            {searchQuery ? 'No se encontraron resultados' : 'Sin notas'}
          </h2>
          <p className="text-neutral-500 mb-4">
            {searchQuery
              ? 'Prueba con otros términos de búsqueda'
              : 'No hay ninguna nota todavía. Haz clic en "+ Nueva nota" para añadir la primera.'}
          </p>
        </div>
      )}

      {/* Table */}
      {filteredAndSortedNotas.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort('urgente')}
                      className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
                    >
                      URGENTE
                      {sortField === 'urgente' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort('nombre')}
                      className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
                    >
                      Nombre
                      {sortField === 'nombre' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort('contacto')}
                      className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
                    >
                      Contacto
                      {sortField === 'contacto' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort('fecha_creacion')}
                      className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
                    >
                      Fecha
                      {sortField === 'fecha_creacion' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-neutral-700">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedNotas.map((nota) => (
                  <tr
                    key={nota.id}
                    onClick={() => navigate(`/notas/${nota.id}`)}
                    className={`border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer ${
                      nota.urgente ? 'bg-danger/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      {nota.urgente ? (
                        <span className="text-danger font-bold text-lg">●</span>
                      ) : (
                        <span className="text-neutral-300">○</span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm ${nota.urgente ? 'text-danger font-semibold' : 'text-neutral-700'}`}
                    >
                      {nota.nombre || <span className="text-neutral-400 italic">Sin nombre</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {nota.contacto || <span className="text-neutral-400 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">
                      {new Date(nota.fecha_creacion).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => handleContextMenu(e, nota)}
                        className="text-neutral-500 hover:text-neutral-700 px-2 py-1"
                        aria-label="Abrir menú de acciones"
                      >
                        ⋮
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-neutral-600">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            onClick={() => {
              navigate(`/notas/${contextMenu.nota.id}`);
              setContextMenu(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => handleToggleUrgente(contextMenu.nota)}
            className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            {contextMenu.nota.urgente ? 'Desmarcar urgente' : 'Marcar urgente'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirm(contextMenu.nota);
              setContextMenu(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/5"
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
