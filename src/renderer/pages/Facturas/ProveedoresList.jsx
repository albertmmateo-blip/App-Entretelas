import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import PDFUploadSection from '../../components/PDFUploadSection';
import { EntriesGrid, EntryCard, EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import { formatEuroAmount, parseEuroAmount } from '../../utils/euroAmount';
import ProveedorForm from './ProveedorForm';

function ProveedoresListView({ tipo = 'compra' }) {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteProveedor } = useCRUD('proveedores');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuState, setMenuState] = useState(null);
  const [folderStats, setFolderStats] = useState({});
  const [totalImporteIvaRe, setTotalImporteIvaRe] = useState(0);
  const basePath = `/contabilidad/${tipo}`;
  const sectionTitle = tipo === 'arreglos' ? 'Contabilidad Arreglos' : 'Contabilidad Compra';
  const uploadedLabel = tipo === 'arreglos' ? 'Archivos subidos' : 'Facturas subidas';
  const isCompra = tipo === 'compra';

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
          setTotalImporteIvaRe(0);
        }
        return;
      }

      if (tipo !== 'compra') {
        if (!cancelled) {
          setFolderStats(
            Object.fromEntries(
              entries.map((proveedor) => [
                proveedor.id,
                {
                  count: proveedor.facturas_count ?? 0,
                  totalIvaRe: 0,
                },
              ])
            )
          );
          setTotalImporteIvaRe(0);
        }
        return;
      }

      if (facturasApi?.getStatsByTipo) {
        try {
          const response = await facturasApi.getStatsByTipo({ tipo });

          if (response.success) {
            const statsFromApi = Object.fromEntries(
              (response.data || []).map((row) => [
                row.entityId,
                {
                  count: row.fileCount ?? 0,
                  totalIvaRe: parseEuroAmount(row.totalImporteIvaRe),
                },
              ])
            );

            const mergedStats = Object.fromEntries(
              entries.map((proveedor) => [
                proveedor.id,
                {
                  count: statsFromApi[proveedor.id]?.count ?? proveedor.facturas_count ?? 0,
                  totalIvaRe: statsFromApi[proveedor.id]?.totalIvaRe ?? 0,
                },
              ])
            );

            const overallTotal = Object.values(mergedStats).reduce(
              (sum, stat) => sum + parseEuroAmount(stat.totalIvaRe),
              0
            );

            if (!cancelled) {
              setFolderStats(mergedStats);
              setTotalImporteIvaRe(overallTotal);
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
              entries.map((proveedor) => [
                proveedor.id,
                {
                  count: proveedor.facturas_count ?? 0,
                  totalIvaRe: 0,
                },
              ])
            )
          );
          setTotalImporteIvaRe(0);
        }
        return;
      }

      const statsPairs = await Promise.all(
        entries.map(async (proveedor) => {
          const fallbackCount = proveedor.facturas_count ?? 0;
          try {
            const response = await facturasApi.getAllForEntidad({
              tipo,
              entidadId: proveedor.id,
            });

            if (response.success) {
              const rows = response.data || [];
              const totalIvaRe = rows.reduce(
                (sum, row) => sum + parseEuroAmount(row.importe_iva_re),
                0
              );
              return [
                proveedor.id,
                {
                  count: rows.length,
                  totalIvaRe,
                },
              ];
            }
          } catch (error) {
            return [
              proveedor.id,
              {
                count: fallbackCount,
                totalIvaRe: 0,
              },
            ];
          }

          return [
            proveedor.id,
            {
              count: fallbackCount,
              totalIvaRe: 0,
            },
          ];
        })
      );

      if (!cancelled) {
        const statsByProveedor = Object.fromEntries(statsPairs);
        const overallTotal = Object.values(statsByProveedor).reduce(
          (sum, stat) => sum + parseEuroAmount(stat.totalIvaRe),
          0
        );

        setFolderStats(statsByProveedor);
        setTotalImporteIvaRe(overallTotal);
      }
    };

    loadFolderCounts();

    return () => {
      cancelled = true;
    };
  }, [entries, tipo]);

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
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">{sectionTitle}</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`${basePath}/nuevo`)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            + Nuevo Proveedor
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
                onClick={() => navigate(`${basePath}/${proveedor.id}`)}
                className="px-3 py-1.5 border border-neutral-200 rounded bg-white hover:border-primary hover:text-primary transition-colors text-sm text-neutral-700 flex items-center gap-3"
                aria-label={`Abrir carpeta de ${proveedor.razon_social}`}
              >
                <span className="font-medium">{`📁 ${proveedor.razon_social}`}</span>
                {isCompra && (
                  <span className="text-xs font-semibold text-primary whitespace-nowrap">
                    {formatEuroAmount(folderStats[proveedor.id]?.totalIvaRe ?? 0)}
                  </span>
                )}
              </button>
            ))}
          </div>
          {isCompra && (
            <div className="mt-3 px-3 py-2 rounded border border-neutral-200 bg-white text-sm text-neutral-700">
              <span className="font-medium">Total Importe + IVA + RE (todas las carpetas): </span>
              <span className="font-semibold text-primary">
                {formatEuroAmount(totalImporteIvaRe)}
              </span>
            </div>
          )}
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
              onClick={() => navigate(`${basePath}/${proveedor.id}`)}
              onActionClick={(e) => setMenuState({ proveedor, x: e.clientX, y: e.clientY })}
            >
              <h3 className="text-lg font-semibold mb-2 text-neutral-900 flex items-start justify-between gap-2">
                <span className="min-w-0 break-words">{proveedor.razon_social}</span>
                {isCompra && (
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {formatEuroAmount(folderStats[proveedor.id]?.totalIvaRe ?? 0)}
                  </span>
                )}
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
                  <span className="font-medium">{uploadedLabel}:</span>{' '}
                  {folderStats[proveedor.id]?.count ?? proveedor.facturas_count ?? 0}
                </div>
                {isCompra && (
                  <div>
                    <span className="font-medium">Importe + IVA + RE:</span>{' '}
                    {formatEuroAmount(folderStats[proveedor.id]?.totalIvaRe ?? 0)}
                  </div>
                )}
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
              navigate(`${basePath}/${menuState.proveedor.id}/editar`);
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

function ProveedorPDFView({ tipo = 'compra' }) {
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
  const basePath = `/contabilidad/${tipo}`;
  const titleLabel = tipo === 'arreglos' ? 'Arreglos' : 'Facturas';
  const entityLabel = tipo === 'arreglos' ? 'Archivo' : 'Factura';

  if (!entidadId) {
    return null;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">
          {proveedor?.razon_social || 'Proveedor'}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`${basePath}/${entidadId}/editar`)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            {`Editar proveedor (${titleLabel.toLowerCase()})`}
          </button>
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>

      {loading && !proveedor ? (
        <LoadingState />
      ) : (
        <PDFUploadSection
          tipo={tipo}
          entidadId={entidadId}
          entidadNombre={proveedor?.razon_social || `Proveedor ${entidadId}`}
          sectionLabel={titleLabel}
          fileLabel={entityLabel}
        />
      )}
    </div>
  );
}

function ProveedoresList({ tipo = 'compra' }) {
  const location = useLocation();
  const { proveedorId } = useParams();
  const isEditRoute = location.pathname.endsWith('/editar');
  const basePath = `/contabilidad/${tipo}`;

  if (proveedorId === 'nuevo' || (proveedorId && isEditRoute)) {
    return (
      <ProveedorForm
        basePath={basePath}
        uploadTipo={tipo}
        sectionLabel={tipo === 'arreglos' ? 'Arreglos' : 'Facturas'}
      />
    );
  }

  if (proveedorId) {
    return <ProveedorPDFView tipo={tipo} />;
  }

  return <ProveedoresListView tipo={tipo} />;
}

export default ProveedoresList;
