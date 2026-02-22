import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import PDFUploadSection from '../../components/PDFUploadSection';
import { EntriesGrid, EntryCard, EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import { formatEuroAmount, parseEuroAmount } from '../../utils/euroAmount';
import ClienteForm from './ClienteForm';

function getDescuentoLabel(descuentoPorcentaje) {
  const normalized = Number.parseInt(descuentoPorcentaje, 10);

  if (normalized === 20) {
    return '20%';
  }

  if (normalized === 10 || normalized === 8) {
    return `${normalized}%`;
  }

  return 'Sin descuento';
}

function getDescuentoBadge(descuentoPorcentaje) {
  const label = getDescuentoLabel(descuentoPorcentaje);
  return label === 'Sin descuento' ? null : label;
}

function ClientesListView() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteCliente } = useCRUD('clientes');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuState, setMenuState] = useState(null);
  const [folderStats, setFolderStats] = useState({});
  const [totalImporteIva, setTotalImporteIva] = useState(0);

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
          setFolderStats({});
          setTotalImporteIva(0);
        }
        return;
      }

      if (facturasApi?.getStatsByTipo) {
        try {
          const response = await facturasApi.getStatsByTipo({ tipo: 'venta' });

          if (response.success) {
            const statsFromApi = Object.fromEntries(
              (response.data || []).map((row) => [
                row.entityId,
                {
                  count: row.fileCount ?? 0,
                  totalIva: parseEuroAmount(row.totalImporteIvaRe),
                },
              ])
            );

            const mergedStats = Object.fromEntries(
              entries.map((cliente) => [
                cliente.id,
                {
                  count: statsFromApi[cliente.id]?.count ?? cliente.facturas_count ?? 0,
                  totalIva: statsFromApi[cliente.id]?.totalIva ?? 0,
                },
              ])
            );

            const overallTotal = Object.values(mergedStats).reduce(
              (sum, stat) => sum + parseEuroAmount(stat.totalIva),
              0
            );

            if (!cancelled) {
              setFolderStats(mergedStats);
              setTotalImporteIva(overallTotal);
            }

            return;
          }
        } catch (error) {
          // Fall back to per-entidad query below
        }
      }

      if (!facturasApi?.getAllForEntidad) {
        if (!cancelled) {
          setFolderStats(
            Object.fromEntries(
              entries.map((cliente) => [
                cliente.id,
                {
                  count: cliente.facturas_count ?? 0,
                  totalIva: 0,
                },
              ])
            )
          );
          setTotalImporteIva(0);
        }
        return;
      }

      const statsPairs = await Promise.all(
        entries.map(async (cliente) => {
          const fallbackCount = cliente.facturas_count ?? 0;
          try {
            const response = await facturasApi.getAllForEntidad({
              tipo: 'venta',
              entidadId: cliente.id,
            });

            if (response.success) {
              const rows = response.data || [];
              const totalIva = rows.reduce(
                (sum, row) => sum + parseEuroAmount(row.importe_iva_re),
                0
              );

              return [
                cliente.id,
                {
                  count: rows.length,
                  totalIva,
                },
              ];
            }
          } catch (error) {
            return [
              cliente.id,
              {
                count: fallbackCount,
                totalIva: 0,
              },
            ];
          }

          return [
            cliente.id,
            {
              count: fallbackCount,
              totalIva: 0,
            },
          ];
        })
      );

      if (!cancelled) {
        const statsByCliente = Object.fromEntries(statsPairs);
        const overallTotal = Object.values(statsByCliente).reduce(
          (sum, stat) => sum + parseEuroAmount(stat.totalIva),
          0
        );

        setFolderStats(statsByCliente);
        setTotalImporteIva(overallTotal);
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

      {sortedClientes.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {sortedClientes.map((cliente) => (
              <button
                key={`shortcut-${cliente.id}`}
                type="button"
                onClick={() => navigate(`/contabilidad/venta/${cliente.id}`)}
                className="px-3 py-1.5 border border-neutral-200 rounded bg-white hover:border-primary hover:text-primary transition-colors text-sm text-neutral-700 flex items-center gap-3"
                aria-label={`Abrir carpeta de ${cliente.razon_social}`}
              >
                <span className="font-medium flex items-center gap-2">
                  <span>{`📁 ${cliente.razon_social}`}</span>
                  {getDescuentoBadge(cliente.descuento_porcentaje) && (
                    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {getDescuentoBadge(cliente.descuento_porcentaje)}
                    </span>
                  )}
                </span>
                <span className="text-xs font-semibold text-primary whitespace-nowrap">
                  {formatEuroAmount(folderStats[cliente.id]?.totalIva ?? 0)}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 px-3 py-2 rounded border border-neutral-200 bg-white text-sm text-neutral-700">
            <span className="font-medium">Total Importe + IVA (todas las carpetas): </span>
            <span className="font-semibold text-primary">{formatEuroAmount(totalImporteIva)}</span>
          </div>
        </div>
      )}

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
              <h3 className="text-lg font-semibold mb-2 text-neutral-900 flex items-start justify-between gap-2">
                <span className="min-w-0 break-words flex items-center gap-2">
                  <span>{cliente.razon_social}</span>
                  {getDescuentoBadge(cliente.descuento_porcentaje) && (
                    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {getDescuentoBadge(cliente.descuento_porcentaje)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-semibold text-primary">
                  {formatEuroAmount(folderStats[cliente.id]?.totalIva ?? 0)}
                </span>
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
                  {folderStats[cliente.id]?.count ?? cliente.facturas_count ?? 0}
                </div>
                <div>
                  <span className="font-medium">Importe + IVA:</span>{' '}
                  {formatEuroAmount(folderStats[cliente.id]?.totalIva ?? 0)}
                </div>
                <div className="text-neutral-500">
                  <span className="font-medium">Creado:</span>{' '}
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
    () => (entidadId ? entries.find((item) => Number(item.id) === Number(entidadId)) : null),
    [entidadId, entries]
  );

  if (!entidadId) {
    return null;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900">
            {cliente?.razon_social || 'Cliente'}
          </h1>
          {cliente?.fecha_creacion && (
            <p className="text-sm text-neutral-500 mt-1">
              Creado: {new Date(cliente.fecha_creacion).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/contabilidad/venta/${entidadId}/editar`)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Editar cliente
          </button>
          <button
            type="button"
            onClick={() => navigate('/contabilidad/venta')}
            className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            ← Volver
          </button>
        </div>
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
