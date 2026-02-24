import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PDFUploadSection from '../../components/PDFUploadSection';
import { LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import { formatEuroAmount } from '../../utils/euroAmount';
import {
  buildFacturasQuarterSummary,
  formatFacturaDisplayDate,
  getFacturaNumberLabel,
  getFacturaTimestamp,
  resolveFacturasAmountWithTaxes,
} from '../../utils/facturasQuarterSummary';
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

function parseInvoiceSearchCommand(rawQuery) {
  const normalized = rawQuery.trim();
  const match = /^f(\d{2}):\s*(.+)$/i.exec(normalized);

  if (!match) {
    return null;
  }

  const year = Number(`20${match[1]}`);
  const filenameQuery = match[2].trim().toLowerCase();

  if (!filenameQuery) {
    return null;
  }

  return { year, filenameQuery };
}

function getInvoiceFilenameBase(row) {
  const source = row.nombre_original || row.nombre_guardado || row.ruta_relativa || '';
  const filename = source.split(/[\\/]/).pop() || source;

  return filename.replace(/\.[^.]+$/, '').toLowerCase();
}

function getInvoiceYear(row) {
  const source = row.fecha || row.fecha_subida;

  if (!source) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    return Number.parseInt(source.slice(0, 4), 10);
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getFullYear();
}

function ClientesListView() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll } = useCRUD('clientes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchSortMode, setSearchSortMode] = useState('alphabetical');
  const [folderCounts, setFolderCounts] = useState({});
  const [foldersWithDuePayment, setFoldersWithDuePayment] = useState({});
  const [quarterSummary, setQuarterSummary] = useState(() =>
    buildFacturasQuarterSummary([], 'venta')
  );
  const [recentInvoices, setRecentInvoices] = useState([]);
  const searchDropdownRef = useRef(null);

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
          setQuarterSummary(buildFacturasQuarterSummary([], 'venta'));
          setRecentInvoices([]);
        }
        return;
      }

      if (!facturasApi?.getAllForEntidad) {
        if (!cancelled) {
          setFolderCounts(
            Object.fromEntries(entries.map((cliente) => [cliente.id, cliente.facturas_count ?? 0]))
          );
          setFoldersWithDuePayment(
            Object.fromEntries(entries.map((cliente) => [cliente.id, false]))
          );
          setQuarterSummary(buildFacturasQuarterSummary([], 'venta'));
          setRecentInvoices([]);
        }
        return;
      }

      try {
        const todayKey = new Date().toISOString().slice(0, 10);
        const rowsByCliente = await Promise.all(
          entries.map(async (cliente) => {
            try {
              const folderResponse = await facturasApi.getAllForEntidad({
                tipo: 'venta',
                entidadId: cliente.id,
              });

              return folderResponse.success ? folderResponse.data || [] : [];
            } catch (error) {
              return [];
            }
          })
        );
        const allRows = rowsByCliente.flat();
        const clienteNameById = Object.fromEntries(
          entries.map((cliente) => [cliente.id, cliente.razon_social || '—'])
        );
        const recentRows = [...allRows]
          .sort((a, b) => getFacturaTimestamp(b) - getFacturaTimestamp(a))
          .map((row) => ({
            id: row.id,
            entidadId: row.entidad_id,
            fecha: formatFacturaDisplayDate(row),
            proveedor: clienteNameById[row.entidad_id] || '—',
            numero: getFacturaNumberLabel(row),
            importe: row.importe,
            amountWithTaxes: resolveFacturasAmountWithTaxes(row, 'venta'),
            invoiceFilenameBase: getInvoiceFilenameBase(row),
            invoiceYear: getInvoiceYear(row),
          }));

        if (!cancelled) {
          setFolderCounts(
            Object.fromEntries(
              entries.map((cliente, index) => [cliente.id, rowsByCliente[index]?.length ?? 0])
            )
          );
          setFoldersWithDuePayment(
            Object.fromEntries(
              entries.map((cliente, index) => [
                cliente.id,
                (rowsByCliente[index] || []).some((row) => hasOverduePayment(row, todayKey)),
              ])
            )
          );
          setQuarterSummary(buildFacturasQuarterSummary(allRows, 'venta'));
          setRecentInvoices(recentRows);
        }
      } catch (error) {
        if (!cancelled) {
          setFolderCounts(
            Object.fromEntries(entries.map((cliente) => [cliente.id, cliente.facturas_count ?? 0]))
          );
          setFoldersWithDuePayment(
            Object.fromEntries(entries.map((cliente) => [cliente.id, false]))
          );
          setQuarterSummary(buildFacturasQuarterSummary([], 'venta'));
          setRecentInvoices([]);
        }
      }
    };

    loadFolderCounts();

    return () => {
      cancelled = true;
    };
  }, [entries]);

  useEffect(() => {
    if (!isSearchDropdownOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isSearchDropdownOpen]);

  const filteredClientes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;

    const invoiceSearch = parseInvoiceSearchCommand(searchQuery);
    if (invoiceSearch) {
      const matchedEntidadIds = new Set(
        recentInvoices
          .filter(
            (invoice) =>
              Number(invoice.invoiceYear) === invoiceSearch.year &&
              invoice.invoiceFilenameBase.includes(invoiceSearch.filenameQuery)
          )
          .map((invoice) => Number(invoice.entidadId))
          .filter((entidadId) => Number.isFinite(entidadId))
      );

      return entries.filter((cliente) => matchedEntidadIds.has(Number(cliente.id)));
    }

    return entries.filter(
      (cliente) =>
        (cliente.razon_social && cliente.razon_social.toLowerCase().includes(query)) ||
        (cliente.numero_cliente && cliente.numero_cliente.toLowerCase().includes(query))
    );
  }, [entries, recentInvoices, searchQuery]);

  const sortedClientes = useMemo(() => {
    if (searchSortMode === 'numero') {
      return [...filteredClientes].sort((a, b) => {
        const aNumber = Number.parseInt(a.numero_cliente, 10);
        const bNumber = Number.parseInt(b.numero_cliente, 10);
        const hasANumber = Number.isFinite(aNumber);
        const hasBNumber = Number.isFinite(bNumber);

        if (hasANumber && hasBNumber && aNumber !== bNumber) {
          return aNumber - bNumber;
        }

        if (hasANumber && !hasBNumber) {
          return -1;
        }

        if (!hasANumber && hasBNumber) {
          return 1;
        }

        return (a.razon_social || '').localeCompare(b.razon_social || '', 'es-ES');
      });
    }

    return [...filteredClientes].sort((a, b) => {
      return (a.razon_social || '').localeCompare(b.razon_social || '', 'es-ES');
    });
  }, [filteredClientes, searchSortMode]);

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

      {/* Search bar and folder dropdown */}
      <div className="mb-4 relative z-30" ref={searchDropdownRef}>
        <input
          type="search"
          placeholder="Buscar por Razón social, Nº cliente o F26:nombre_factura..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={() => setIsSearchDropdownOpen(true)}
          onFocus={() => setIsSearchDropdownOpen(true)}
          onMouseDown={() => setIsSearchDropdownOpen(true)}
          data-search-input
          className="w-full px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {isSearchDropdownOpen && (
          <div className="absolute left-0 right-0 mt-1 z-40 border border-neutral-200 rounded bg-white overflow-hidden shadow-sm">
            <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setSearchSortMode((currentMode) =>
                    currentMode === 'alphabetical' ? 'numero' : 'alphabetical'
                  )
                }
                className="px-2 py-1 text-xs font-semibold border border-neutral-200 rounded hover:border-primary hover:text-primary transition-colors"
              >
                {searchSortMode === 'alphabetical' ? 'Orden: A-Z' : 'Orden: Nº'}
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {sortedClientes.length > 0 ? (
                sortedClientes.map((cliente) => {
                  const folderLabel = `${cliente.razon_social || '—'} - ${cliente.numero_cliente || '—'}`;
                  const descuentoBadge = getDescuentoBadge(cliente.descuento_porcentaje);

                  return (
                    <button
                      key={`shortcut-${cliente.id}`}
                      type="button"
                      onClick={() => {
                        setIsSearchDropdownOpen(false);
                        navigate(`/contabilidad/venta/${cliente.id}`);
                      }}
                      className="w-full px-3 py-2 border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50 transition-colors text-left"
                      aria-label={`Abrir carpeta de ${cliente.razon_social}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900 truncate">
                            {folderLabel}
                          </span>
                          {descuentoBadge ? (
                            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              {descuentoBadge}
                            </span>
                          ) : null}
                          {foldersWithDuePayment[cliente.id] && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full bg-danger"
                              title="Tiene pagos vencidos"
                              aria-label="Tiene pagos vencidos"
                            />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-primary whitespace-nowrap">
                          ({folderCounts[cliente.id] ?? 0})
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-sm text-neutral-500">
                  No se encontraron clientes.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 overflow-hidden border border-neutral-200 rounded-lg bg-white">
        <div className="max-h-56 overflow-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-neutral-100 text-neutral-700 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold whitespace-nowrap">
                  Fecha
                </th>
                <th scope="col" className="px-4 py-2 font-semibold whitespace-nowrap">
                  Cliente
                </th>
                <th scope="col" className="px-4 py-2 font-semibold whitespace-nowrap">
                  #
                </th>
                <th scope="col" className="px-4 py-2 font-semibold text-right whitespace-nowrap">
                  Importe
                </th>
                <th scope="col" className="px-4 py-2 font-semibold text-right whitespace-nowrap">
                  Importe + IVA
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
                          onClick={() => navigate(`/contabilidad/venta/${invoice.entidadId}`)}
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
                    Sin facturas de venta registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-4 mt-3 overflow-x-auto border border-neutral-200 rounded-lg bg-neutral-50">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-neutral-100 text-neutral-700">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">
                Periodo
              </th>
              <th scope="col" className="px-4 py-2 font-semibold text-right whitespace-nowrap">
                Importe
              </th>
              <th scope="col" className="px-4 py-2 font-semibold text-right whitespace-nowrap">
                Importe + IVA
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
  const clienteDisplayName = useMemo(() => {
    if (!cliente) {
      return '';
    }

    if (cliente.numero_cliente) {
      return `${cliente.razon_social} - ${cliente.numero_cliente}`;
    }

    return cliente.razon_social;
  }, [cliente]);

  if (!entidadId) {
    return null;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900">{clienteDisplayName || 'Cliente'}</h1>
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
          entidadNombre={clienteDisplayName || `Cliente ${entidadId}`}
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
