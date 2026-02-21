import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import PDFUploadSection from '../../components/PDFUploadSection';
import { EntriesGrid, EntryCard, EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import ClienteForm from './ClienteForm';

function ClientesListView() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteCliente } = useCRUD('clientes');
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
            Object.fromEntries(entries.map((cliente) => [cliente.id, cliente.facturas_count ?? 0]))
          );
        }
        return;
      }

      const countPairs = await Promise.all(
        entries.map(async (cliente) => {
          const fallbackCount = cliente.facturas_count ?? 0;
          try {
            const response = await facturasApi.getAllForEntidad({
              tipo: 'venta',
              entidadId: cliente.id,
            });

            if (response.success) {
              return [cliente.id, (response.data || []).length];
            }
          } catch (error) {
            return [cliente.id, fallbackCount];
          }

          return [cliente.id, fallbackCount];
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

  const filteredClientes = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(
      (cliente) =>
        (cliente.razon_social && cliente.razon_social.toLowerCase().includes(query)) ||
        (cliente.numero_cliente && cliente.numero_cliente.toLowerCase().includes(query)) ||
        (cliente.direccion && cliente.direccion.toLowerCase().includes(query)) ||
        (cliente.nif && cliente.nif.toLowerCase().includes(query))
    );
  }, [entries, searchQuery]);

  const sortedClientes = useMemo(() => {
    return [...filteredClientes].sort((a, b) => {
      return a.razon_social.localeCompare(b.razon_social, 'es-ES');
    });
  }, [filteredClientes]);

  const handleDelete = async (id) => {
    const success = await deleteCliente(id);
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
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">Contabilidad Venta</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/contabilidad/venta/nuevo')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            + Nuevo Cliente
          </button>
          <button
            type="button"
            onClick={() => navigate('/contabilidad')}
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
          placeholder="Buscar cliente..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-search-input
          className="w-full px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Empty state */}
      {sortedClientes.length === 0 && !loading && (
        <EmptyState icon="📁" title="clientes" hasSearchQuery={!!searchQuery} />
      )}

      {/* Grid */}
      {sortedClientes.length > 0 && (
        <EntriesGrid>
          {sortedClientes.map((cliente) => (
            <EntryCard
              key={cliente.id}
              urgente={false}
              onClick={() => navigate(`/contabilidad/venta/${cliente.id}`)}
              onActionClick={(e) => setMenuState({ cliente, x: e.clientX, y: e.clientY })}
            >
              <h3 className="text-lg font-semibold mb-2 text-neutral-900">
                {cliente.razon_social}
              </h3>
              <div className="space-y-1 text-sm text-neutral-700">
                <div>
                  <span className="font-medium">Nº Cliente:</span> {cliente.numero_cliente}
                </div>
                {cliente.nif && (
                  <div>
                    <span className="font-medium">NIF:</span> {cliente.nif}
                  </div>
                )}
                {cliente.direccion && (
                  <div>
                    <span className="font-medium">Dirección:</span> {cliente.direccion}
                  </div>
                )}
                <div>
                  <span className="font-medium">Archivos subidos:</span>{' '}
                  {folderCounts[cliente.id] ?? cliente.facturas_count ?? 0}
                </div>
                <div className="text-neutral-500">
                  {new Date(cliente.fecha_creacion).toLocaleDateString('es-ES')}
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
              navigate(`/contabilidad/venta/${menuState.cliente.id}/editar`);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirm(menuState.cliente);
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
          title="¿Eliminar este cliente?"
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

function ClientePDFView() {
  const navigate = useNavigate();
  const { clienteId } = useParams();
  const parsedId = parseInt(clienteId, 10);
  const entidadId = Number.isNaN(parsedId) ? null : parsedId;
  const { entries, loading, fetchAll } = useCRUD('clientes');

  useEffect(() => {
    if (entidadId && entries.length === 0) {
      fetchAll();
    }
  }, [entidadId, entries.length, fetchAll]);

  const cliente = useMemo(
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
            onClick={() => navigate('/contabilidad/venta')}
            className="text-primary hover:text-primary/80 flex items-center gap-1 mb-2"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">
            {cliente?.razon_social || 'Cliente'}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/contabilidad/venta/${entidadId}/editar`)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          Editar cliente
        </button>
      </div>

      {loading && !cliente ? (
        <LoadingState />
      ) : (
        <PDFUploadSection
          tipo="venta"
          entidadId={entidadId}
          entidadNombre={cliente?.razon_social || `Cliente ${entidadId}`}
          sectionLabel="Facturas"
          fileLabel="Factura"
        />
      )}
    </div>
  );
}

function ClientesList() {
  const location = useLocation();
  const { clienteId } = useParams();
  const isEditRoute = location.pathname.endsWith('/editar');

  if (clienteId === 'nuevo' || (clienteId && isEditRoute)) {
    return <ClienteForm />;
  }

  if (clienteId) {
    return <ClientePDFView />;
  }

  return <ClientesListView />;
}

export default ClientesList;
