import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PDFUploadSection from '../../components/PDFUploadSection';
import { EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import { formatEuroAmount } from '../../utils/euroAmount';
import { buildFacturasQuarterSummary } from '../../utils/facturasQuarterSummary';
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
  const { entries, loading, fetchAll } = useCRUD('clientes');
  const [searchQuery, setSearchQuery] = useState('');
  const [quarterSummary, setQuarterSummary] = useState(() => buildFacturasQuarterSummary());

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

      if (!facturasApi?.getAllForEntidad) {
        if (!cancelled) setQuarterSummary(buildFacturasQuarterSummary());
        return;
      }

      try {
        const response = await facturasApi.getAllForEntidad({ tipo: 'venta' });

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
              </button>
            ))}
          </div>

          <div className="mt-3 overflow-x-auto border border-neutral-200 rounded-lg bg-neutral-50">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-neutral-100 text-neutral-700">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Periodo
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold text-right whitespace-nowrap">
                    Importe+IVA
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
        </div>
      )}

      {/* Empty state */}
      {sortedClientes.length === 0 && !loading && (
        <EmptyState icon="📁" title="clientes" hasSearchQuery={!!searchQuery} />
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
