import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import useCRUD from '../../hooks/useCRUD';
import LlamarForm from './LlamarForm';

function LlamarList() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteLlamar, toggleUrgente } = useCRUD('llamar');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  const handleDelete = async (id) => {
    const success = await deleteLlamar(id);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const handleToggleUrgente = async (llamar) => {
    await toggleUrgente(llamar.id, !llamar.urgente);
  };

  const columns = useMemo(
    () => [
      {
        key: 'urgente',
        label: 'URGENTE',
        sortable: true,
        render: (value) =>
          value ? (
            <span className="text-danger font-bold text-lg">●</span>
          ) : (
            <span className="text-neutral-300">○</span>
          ),
        sortValue: (row) => (row.urgente ? 1 : 0),
      },
      {
        key: 'asunto',
        label: 'Asunto',
        sortable: true,
        render: (value, row) => (
          <span className={row.urgente ? 'text-danger font-semibold' : 'text-neutral-700'}>
            {value}
          </span>
        ),
      },
      {
        key: 'contacto',
        label: 'Contacto',
        sortable: true,
        render: (value) => value,
      },
      {
        key: 'nombre',
        label: 'Nombre',
        sortable: true,
        render: (value) => value || <span className="text-neutral-400 italic">—</span>,
      },
      {
        key: 'fecha_creacion',
        label: 'Fecha',
        sortable: true,
        render: (value) => new Date(value).toLocaleDateString('es-ES'),
      },
    ],
    []
  );

  if (loading && entries.length === 0) {
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
      {filteredLlamar.length === 0 && !loading && (
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

      {/* Table */}
      {filteredLlamar.length > 0 && (
        <DataTable
          columns={columns}
          data={filteredLlamar}
          onRowClick={(llamar) => navigate(`/llamar/${llamar.id}`)}
          initialSort={{ key: 'fecha_creacion', direction: 'desc' }}
          rowClassName={(llamar) => (llamar.urgente ? 'bg-danger/5' : '')}
          renderActions={(llamar) => [
            {
              label: 'Editar',
              onClick: () => navigate(`/llamar/${llamar.id}`),
            },
            {
              label: llamar.urgente ? 'Desmarcar urgente' : 'Marcar urgente',
              onClick: () => handleToggleUrgente(llamar),
            },
            {
              label: 'Eliminar',
              danger: true,
              onClick: () => setDeleteConfirm(llamar),
            },
          ]}
        />
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
