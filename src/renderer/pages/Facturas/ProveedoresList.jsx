import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PDFUploadSection from '../../components/PDFUploadSection';
import { EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import { formatEuroAmount } from '../../utils/euroAmount';
import {
  buildFacturasQuarterSummary,
  formatFacturaDisplayDate,
  getFacturaNumberLabel,
  getFacturaTimestamp,
  resolveFacturasAmountWithTaxes,
} from '../../utils/facturasQuarterSummary';
import ProveedorForm from './ProveedorForm';

function hasOverduePayment(row, todayKey) {
  if (row.pagada === 1 || row.pagada === true || row.pagada === '1') {
    return false;
  }

  if (!row.vencimiento) {
    return true;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(row.vencimiento)) {
    return row.vencimiento <= todayKey;
  }

  const dueDate = new Date(row.vencimiento);
  if (Number.isNaN(dueDate.getTime())) {
    return true;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return dueDate <= today;
}

function ProveedoresListView({ tipo = 'compra' }) {
  const navigate = useNavigate();
  const { entries, loading, fetchAll } = useCRUD('proveedores');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderCounts, setFolderCounts] = useState({});
  const [foldersWithDuePayment, setFoldersWithDuePayment] = useState({});
  const [quarterSummary, setQuarterSummary] = useState(() => buildFacturasQuarterSummary([], tipo));
  const [recentInvoices, setRecentInvoices] = useState([]);
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
          setFolderCounts({});
          setFoldersWithDuePayment({});
          setQuarterSummary(buildFacturasQuarterSummary([], tipo));
          setRecentInvoices([]);
        }
        return;
      }

      if (tipo !== 'compra') {
        if (!cancelled) {
          setFolderCounts(
            Object.fromEntries(
              entries.map((proveedor) => [proveedor.id, proveedor.facturas_count ?? 0])
            )
          );
          setFoldersWithDuePayment(
            Object.fromEntries(entries.map((proveedor) => [proveedor.id, false]))
          );
          setQuarterSummary(buildFacturasQuarterSummary([], tipo));
          setRecentInvoices([]);
        }
        return;
      }

      if (!facturasApi?.getAllForEntidad) {
        if (!cancelled) {
          setFolderCounts(
            Object.fromEntries(
              entries.map((proveedor) => [proveedor.id, proveedor.facturas_count ?? 0])
            )
          );
          setFoldersWithDuePayment(
            Object.fromEntries(entries.map((proveedor) => [proveedor.id, false]))
          );
          setQuarterSummary(buildFacturasQuarterSummary([], tipo));
          setRecentInvoices([]);
        }
        return;
      }

      try {
        const todayKey = new Date().toISOString().slice(0, 10);
        const rowsByProveedor = await Promise.all(
          entries.map(async (proveedor) => {
            try {
              const folderResponse = await facturasApi.getAllForEntidad({
                tipo,
                entidadId: proveedor.id,
              });

              return folderResponse.success ? folderResponse.data || [] : [];
            } catch (error) {
              return [];
            }
          })
        );
        const allRows = rowsByProveedor.flat();
        const proveedorNameById = Object.fromEntries(
          entries.map((proveedor) => [proveedor.id, proveedor.razon_social || '—'])
        );
        const recentRows = [...allRows]
          .sort((a, b) => getFacturaTimestamp(b) - getFacturaTimestamp(a))
          .map((row) => ({
            id: row.id,
            entidadId: row.entidad_id,
            fecha: formatFacturaDisplayDate(row),
            proveedor: proveedorNameById[row.entidad_id] || '—',
            numero: getFacturaNumberLabel(row),
            importe: row.importe,
            amountWithTaxes: resolveFacturasAmountWithTaxes(row, tipo),
          }));

        if (!cancelled) {
          setFolderCounts(
            Object.fromEntries(
              entries.map((proveedor, index) => [proveedor.id, rowsByProveedor[index]?.length ?? 0])
            )
          );
          setFoldersWithDuePayment(
            Object.fromEntries(
              entries.map((proveedor, index) => [
                proveedor.id,
                (rowsByProveedor[index] || []).some((row) => hasOverduePayment(row, todayKey)),
              ])
            )
          );
          setQuarterSummary(buildFacturasQuarterSummary(allRows, tipo));
          setRecentInvoices(recentRows);
        }
      } catch (error) {
        if (!cancelled) {
          setFolderCounts(
            Object.fromEntries(
              entries.map((proveedor) => [proveedor.id, proveedor.facturas_count ?? 0])
            )
          );
          setFoldersWithDuePayment(
            Object.fromEntries(entries.map((proveedor) => [proveedor.id, false]))
          );
          setQuarterSummary(buildFacturasQuarterSummary([], tipo));
          setRecentInvoices([]);
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
            Nuevo Proveedor
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
                <span className="font-medium flex items-center gap-2">
                  <span>{`📁 ${proveedor.razon_social}`}</span>
                  {foldersWithDuePayment[proveedor.id] && (
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full bg-danger"
                      title="Tiene pagos vencidos"
                      aria-label="Tiene pagos vencidos"
                    />
                  )}
                </span>
                <span className="text-xs font-semibold text-primary whitespace-nowrap">
                  {folderCounts[proveedor.id] ?? 0}
                </span>
              </button>
            ))}
          </div>
          {isCompra && (
            <div className="mt-3 overflow-hidden border border-neutral-200 rounded-lg bg-white">
              <div className="max-h-56 overflow-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-neutral-100 text-neutral-700 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-semibold whitespace-nowrap">
                        Fecha
                      </th>
                      <th scope="col" className="px-4 py-2 font-semibold whitespace-nowrap">
                        Proveedor
                      </th>
                      <th scope="col" className="px-4 py-2 font-semibold whitespace-nowrap">
                        #
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2 font-semibold text-right whitespace-nowrap"
                      >
                        Importe
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2 font-semibold text-right whitespace-nowrap"
                      >
                        Importe + IVA + RE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.length > 0 ? (
                      recentInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-t border-neutral-200">
                          <td className="px-4 py-2 text-neutral-700 whitespace-nowrap">
                            {invoice.fecha}
                          </td>
                          <td className="px-4 py-2 text-neutral-900">
                            {invoice.entidadId ? (
                              <button
                                type="button"
                                onClick={() => navigate(`${basePath}/${invoice.entidadId}`)}
                                className="text-left hover:text-primary hover:underline transition-colors"
                              >
                                {invoice.proveedor}
                              </button>
                            ) : (
                              invoice.proveedor
                            )}
                          </td>
                          <td className="px-4 py-2 text-neutral-700">{invoice.numero || '—'}</td>
                          <td className="px-4 py-2 text-right text-neutral-900 whitespace-nowrap">
                            {formatEuroAmount(invoice.importe)}
                          </td>
                          <td className="px-4 py-2 text-right text-neutral-900 whitespace-nowrap">
                            {formatEuroAmount(invoice.amountWithTaxes)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-neutral-200">
                        <td colSpan={5} className="px-4 py-4 text-sm text-neutral-500">
                          Sin facturas de compra registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                      Importe
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 font-semibold text-right whitespace-nowrap"
                    >
                      Importe + IVA + RE
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
                          {formatEuroAmount(quarter.total.importe)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-neutral-900 whitespace-nowrap">
                          {formatEuroAmount(quarter.total.amountWithTaxes)}
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
                            {formatEuroAmount(month.total.importe)}
                          </td>
                          <td className="px-4 py-1.5 text-right text-xs font-medium text-neutral-500 whitespace-nowrap">
                            {formatEuroAmount(month.total.amountWithTaxes)}
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
                      {formatEuroAmount(quarterSummary.annualTotal.importe)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-primary whitespace-nowrap">
                      {formatEuroAmount(quarterSummary.annualTotal.amountWithTaxes)}
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
