import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PDFUploadSection from '../../components/PDFUploadSection';
import { EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import { formatEuroAmount } from '../../utils/euroAmount';
import { buildFacturasQuarterSummary } from '../../utils/facturasQuarterSummary';
import ProveedorForm from './ProveedorForm';

function ProveedoresListView({ tipo = 'compra' }) {
  const navigate = useNavigate();
  const { entries, loading, fetchAll } = useCRUD('proveedores');
  const [searchQuery, setSearchQuery] = useState('');
  const [quarterSummary, setQuarterSummary] = useState(() => buildFacturasQuarterSummary());
  const basePath = `/contabilidad/${tipo}`;
  const sectionTitle = tipo === 'arreglos' ? 'Contabilidad Arreglos' : 'Contabilidad Compra';
  const isCompra = tipo === 'compra';

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    let cancelled = false;

    const loadFolderCounts = async () => {
      const facturasApi = window.electronAPI?.facturas;

      if (!entries.length) {
        if (!cancelled) {
          setQuarterSummary(buildFacturasQuarterSummary());
        }
        return;
      }

      if (tipo !== 'compra') {
        if (!cancelled) setQuarterSummary(buildFacturasQuarterSummary());
        return;
      }

      if (!facturasApi?.getAllForEntidad) {
        if (!cancelled) setQuarterSummary(buildFacturasQuarterSummary());
        return;
      }

      try {
        const response = await facturasApi.getAllForEntidad({ tipo });

        if (!cancelled) {
          setQuarterSummary(
            response.success
              ? buildFacturasQuarterSummary(response.data || [])
              : buildFacturasQuarterSummary()
          );
        }
      } catch (error) {
        if (!cancelled) {
          setQuarterSummary(buildFacturasQuarterSummary());
        }
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
              </button>
            ))}
          </div>
          {isCompra && (
            <div className="mt-3 overflow-x-auto border border-neutral-200 rounded-lg bg-neutral-50">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-neutral-100 text-neutral-700">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">
                      Periodo
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 font-semibold text-right whitespace-nowrap"
                    >
                      Importe+IVA+RE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quarterSummary.quarters.map((quarter) => (
                    <React.Fragment key={quarter.key}>
                      <tr className="border-t border-neutral-200 bg-white">
                        <th scope="row" className="px-4 py-2 font-semibold text-neutral-900">
                          {quarter.key}
                        </th>
                        <td className="px-4 py-2 text-right font-semibold text-neutral-900 whitespace-nowrap">
                          {formatEuroAmount(quarter.total)}
                        </td>
                      </tr>
                      {quarter.months.map((month) => (
                        <tr
                          key={`${quarter.key}-${month.monthIndex}`}
                          className="border-t border-neutral-200/70"
                        >
                          <th
                            scope="row"
                            className="px-4 py-1.5 pl-8 text-xs font-medium text-neutral-500"
                          >
                            {month.label}
                          </th>
                          <td className="px-4 py-1.5 text-right text-xs font-medium text-neutral-500 whitespace-nowrap">
                            {formatEuroAmount(month.total)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  <tr className="border-t-2 border-neutral-300 bg-neutral-100/70">
                    <th scope="row" className="px-4 py-2 font-semibold text-primary">
                      Total anual
                    </th>
                    <td className="px-4 py-2 text-right font-semibold text-primary whitespace-nowrap">
                      {formatEuroAmount(quarterSummary.annualTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {sortedProveedores.length === 0 && !loading && (
        <EmptyState icon="📁" title="proveedores" hasSearchQuery={!!searchQuery} />
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
            Editar proveedor
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
