import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import useCRUD from '../../hooks/useCRUD';
import { formatEuroAmount, parseEuroAmount } from '../../utils/euroAmount';
import {
  ALBARAN_OPTIONS,
  buildArreglosQuarterSummary,
  monthKeyFromFecha,
  monthLabelFromKey,
  normalizeFolderValue,
  splitArreglosTotal,
} from '../../utils/arreglosMonthlySummary';

async function openMonthlySummaryWindow(scope = 'all') {
  const systemApi = window.electronAPI?.system;
  const popupUrl = `/#/contabilidad/arreglos/resumenes-mensuales?scope=${encodeURIComponent(scope)}`;

  if (systemApi?.openArreglosMonthlySummariesWindow) {
    try {
      const response = await systemApi.openArreglosMonthlySummariesWindow(scope);
      if (response?.success) {
        return;
      }
    } catch {
      // fall through to popup fallback
    }
  }

  window.open(popupUrl, '_blank', 'popup=yes,width=960,height=760,resizable=yes');
}

const COLUMNS = [
  {
    key: 'albaran',
    label: 'Albarán',
    sortable: true,
  },
  {
    key: 'fecha',
    label: 'Fecha',
    sortable: true,
    render: (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-ES') : '—'),
    sortValue: (row) => row.fecha || '',
  },
  {
    key: 'numero',
    label: '#',
    sortable: true,
    sortValue: (row) => row.numero || '',
  },
  {
    key: 'cliente',
    label: 'Cliente',
    sortable: true,
    sortValue: (row) => row.cliente || '',
    render: (value) => value || <span className="text-neutral-400">—</span>,
  },
  {
    key: 'arreglo',
    label: 'Arreglo',
    sortable: true,
    sortValue: (row) => row.arreglo || '',
    render: (value) => value || <span className="text-neutral-400">—</span>,
  },
  {
    key: 'importe',
    label: 'Importe',
    sortable: true,
    sortValue: (row) => parseEuroAmount(row.importe),
    render: (value) => formatEuroAmount(value),
  },
];

const ALBARAN_COLOR_STYLES = {
  Entretelas: {
    strongTextColor: 'var(--logo-orange)',
    softBackground: 'rgba(232, 119, 34, 0.12)',
    softBorder: 'rgba(232, 119, 34, 0.35)',
    rowClassName: '!bg-[#f9ddc7] hover:!bg-[#f4c79d]',
  },
  Isa: {
    strongTextColor: '#248532',
    softBackground: 'rgba(36, 133, 50, 0.12)',
    softBorder: 'rgba(36, 133, 50, 0.35)',
    rowClassName: '!bg-[#d9efdd] hover:!bg-[#bfe2c6]',
  },
  Loli: {
    strongTextColor: '#85243c',
    softBackground: 'rgba(133, 36, 60, 0.12)',
    softBorder: 'rgba(133, 36, 60, 0.35)',
    rowClassName: '!bg-[#efd4dc] hover:!bg-[#e0b2c0]',
  },
};

function getAlbaranColorStyles(folder) {
  return ALBARAN_COLOR_STYLES[folder] || null;
}

function ArreglosListView() {
  const navigate = useNavigate();
  const { albaran } = useParams();
  const { entries, loading, fetchAll, delete: deleteArreglo } = useCRUD('arreglos');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const selectedFolder = useMemo(() => normalizeFolderValue(albaran), [albaran]);
  const listBasePath = selectedFolder
    ? `/contabilidad/arreglos/carpeta/${selectedFolder}`
    : '/contabilidad/arreglos';

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const entriesInScope = useMemo(() => {
    if (!selectedFolder) {
      return entries;
    }

    return entries.filter((entry) => entry.albaran === selectedFolder);
  }, [entries, selectedFolder]);

  const folderCurrentMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return Object.fromEntries(
      ALBARAN_OPTIONS.map((folder) => {
        const folderEntriesThisMonth = entries.filter(
          (entry) => entry.albaran === folder && monthKeyFromFecha(entry.fecha) === currentMonthKey
        );
        const totalImporte = folderEntriesThisMonth.reduce(
          (sum, entry) => sum + parseEuroAmount(entry.importe),
          0
        );

        return [
          folder,
          {
            count: folderEntriesThisMonth.length,
            totalImporte,
          },
        ];
      })
    );
  }, [entries]);

  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return monthLabelFromKey(key);
  }, []);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return entriesInScope;
    }

    const query = searchQuery.toLowerCase();
    return entriesInScope.filter((entry) => {
      const values = [
        entry.albaran,
        entry.fecha,
        entry.numero,
        entry.cliente,
        entry.arreglo,
        String(entry.importe ?? ''),
      ];

      return values.some((value) => value && String(value).toLowerCase().includes(query));
    });
  }, [entriesInScope, searchQuery]);

  const handleDelete = async (id) => {
    const success = await deleteArreglo(id);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">Contabilidad Arreglos</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`${listBasePath}/nueva`)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Nueva entrada
          </button>
          <button
            type="button"
            onClick={() => openMonthlySummaryWindow(selectedFolder || 'all')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Resumenes mensuales
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

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {ALBARAN_OPTIONS.map((folder) => {
            const isActive = selectedFolder === folder;

            return (
              <button
                key={folder}
                type="button"
                onClick={() => navigate(`/contabilidad/arreglos/carpeta/${folder}`)}
                className={`px-3 py-1.5 border rounded transition-colors text-sm ${
                  isActive
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary hover:text-primary'
                }`}
              >
                {folder}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => navigate('/contabilidad/arreglos')}
            className={`px-3 py-1.5 border rounded transition-colors text-sm ${
              !selectedFolder
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary hover:text-primary'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {ALBARAN_OPTIONS.map((folder) => {
          const stats = folderCurrentMonthStats[folder] || { count: 0, totalImporte: 0 };
          const split = splitArreglosTotal(stats.totalImporte);
          const colorStyles = getAlbaranColorStyles(folder);

          return (
            <div
              key={folder}
              className="px-3 py-2 rounded border"
              style={{
                backgroundColor: colorStyles?.softBackground,
                borderColor: colorStyles?.softBorder,
              }}
            >
              <div className="text-sm font-medium" style={{ color: colorStyles?.strongTextColor }}>
                {folder}
              </div>
              <div className="text-xs text-neutral-600 leading-tight">{currentMonthLabel}</div>
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <div className="text-[11px] text-neutral-600 leading-tight">Total</div>
                  <div
                    className="text-base font-semibold leading-tight"
                    style={{ color: colorStyles?.strongTextColor }}
                  >
                    {formatEuroAmount(split.total)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-600 leading-tight">{folder} (65%)</div>
                  <div
                    className="text-base font-semibold leading-tight"
                    style={{ color: colorStyles?.strongTextColor }}
                  >
                    {formatEuroAmount(split.folderShare)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-600 leading-tight">Tienda (35%)</div>
                  <div
                    className="text-base font-semibold leading-tight"
                    style={{ color: colorStyles?.strongTextColor }}
                  >
                    {formatEuroAmount(split.tiendaShare)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-neutral-600 mt-1 leading-tight">
                {stats.count} entrada{stats.count !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder={
            selectedFolder ? `Buscar en arreglos (${selectedFolder})...` : 'Buscar en arreglos...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-search-input
          className="w-full px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {!loading && (
        <p className="text-xs text-neutral-400 mb-2">
          {filteredEntries.length} entrada{filteredEntries.length !== 1 ? 's' : ''}
        </p>
      )}

      {loading && <div className="text-sm text-neutral-500 py-8 text-center">Cargando...</div>}

      {!loading && filteredEntries.length === 0 && (
        <div className="flex flex-col items-center py-16 text-neutral-400">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-lg font-medium">
            {searchQuery ? 'No hay entradas que coincidan con la búsqueda' : 'No hay entradas'}
          </p>
        </div>
      )}

      {!loading && filteredEntries.length > 0 && (
        <DataTable
          columns={COLUMNS}
          data={filteredEntries}
          onRowClick={(row) => navigate(`${listBasePath}/${row.id}`)}
          initialSort={{ key: 'fecha', direction: 'desc' }}
          headerRowClassName="bg-sky-300 border-sky-400"
          headerCellClassName="py-2.5"
          headerLabelClassName="text-base font-extrabold text-neutral-900 tracking-normal"
          bodyCellVerticalAlign="middle"
          bodyCellClassName="py-2.5 font-medium"
          actionCellClassName="py-2.5"
          rowClassName={(row) => getAlbaranColorStyles(row.albaran)?.rowClassName || ''}
          renderActions={(row) => [
            {
              label: 'Editar',
              onClick: () => navigate(`${listBasePath}/${row.id}`),
            },
            {
              label: 'Eliminar',
              onClick: () => setDeleteConfirm(row),
              danger: true,
            },
          ]}
        />
      )}

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

function ArreglosForm() {
  const navigate = useNavigate();
  const { id, albaran } = useParams();
  const scopedFolder = useMemo(() => normalizeFolderValue(albaran), [albaran]);
  const listBasePath = scopedFolder
    ? `/contabilidad/arreglos/carpeta/${scopedFolder}`
    : '/contabilidad/arreglos';
  const isEdit = id && id !== 'nueva';
  const { entries, fetchAll, create, update } = useCRUD('arreglos');
  const existingEntry = useMemo(
    () => (isEdit ? entries.find((entry) => entry.id === parseInt(id, 10)) : null),
    [entries, id, isEdit]
  );

  const [formData, setFormData] = useState({
    albaran: scopedFolder || 'Entretelas',
    fecha: new Date().toISOString().slice(0, 10),
    numero: '',
    cliente: '',
    arreglo: '',
    importe: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && entries.length === 0) {
      fetchAll();
    }
  }, [entries.length, fetchAll, isEdit]);

  useEffect(() => {
    if (!scopedFolder || existingEntry) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      albaran: scopedFolder,
    }));
  }, [existingEntry, scopedFolder]);

  useEffect(() => {
    if (!existingEntry) {
      return;
    }

    setFormData({
      albaran: existingEntry.albaran || 'Entretelas',
      fecha: existingEntry.fecha || new Date().toISOString().slice(0, 10),
      numero: existingEntry.numero || '',
      cliente: existingEntry.cliente || '',
      arreglo: existingEntry.arreglo || '',
      importe: formatEuroAmount(existingEntry.importe),
    });
  }, [existingEntry]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleImporteBlur = () => {
    const parsed = parseEuroAmount(formData.importe);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      importe: formatEuroAmount(parsed),
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.albaran || !ALBARAN_OPTIONS.includes(formData.albaran)) {
      nextErrors.albaran = 'Selecciona un albarán válido';
    }

    if (!formData.fecha) {
      nextErrors.fecha = 'Este campo es obligatorio';
    }

    if (!formData.numero.trim()) {
      nextErrors.numero = 'Este campo es obligatorio';
    }

    if (!formData.importe || formData.importe.trim().length === 0) {
      nextErrors.importe = 'Este campo es obligatorio';
    } else {
      const parsedImporte = parseEuroAmount(formData.importe);
      if (!Number.isFinite(parsedImporte) || parsedImporte < 0) {
        nextErrors.importe = 'Introduce un importe válido en €';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setSaving(true);

    const payload = {
      albaran: formData.albaran,
      fecha: formData.fecha,
      numero: formData.numero.trim(),
      cliente: formData.cliente.trim() || null,
      arreglo: formData.arreglo.trim() || null,
      importe: parseEuroAmount(formData.importe),
    };

    const result = isEdit ? await update(parseInt(id, 10), payload) : await create(payload);

    setSaving(false);

    if (result) {
      navigate(listBasePath);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center">
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">
          {isEdit ? 'Editar entrada de arreglo' : 'Nueva entrada de arreglo'}
        </h1>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => navigate(listBasePath)}
            className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-neutral-100 rounded-lg shadow p-6 space-y-6">
        <div>
          <label htmlFor="albaran" className="block text-sm font-medium text-neutral-700 mb-2">
            <span>Albarán *</span>
            <select
              id="albaran"
              name="albaran"
              value={formData.albaran}
              onChange={handleFieldChange}
              disabled={Boolean(scopedFolder)}
              className="mt-2 w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {ALBARAN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {errors.albaran && <p className="text-sm text-danger mt-1">{errors.albaran}</p>}
        </div>

        <div>
          <label htmlFor="fecha" className="block text-sm font-medium text-neutral-700 mb-2">
            <span>Fecha *</span>
            <input
              id="fecha"
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleFieldChange}
              className="mt-2 w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </label>
          {errors.fecha && <p className="text-sm text-danger mt-1">{errors.fecha}</p>}
        </div>

        <div>
          <label htmlFor="numero" className="block text-sm font-medium text-neutral-700 mb-2">
            <span># *</span>
            <input
              id="numero"
              type="text"
              name="numero"
              value={formData.numero}
              onChange={handleFieldChange}
              maxLength={100}
              className="mt-2 w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </label>
          {errors.numero && <p className="text-sm text-danger mt-1">{errors.numero}</p>}
        </div>

        <div>
          <label htmlFor="cliente" className="block text-sm font-medium text-neutral-700 mb-2">
            <span>Cliente</span>
            <input
              id="cliente"
              type="text"
              name="cliente"
              value={formData.cliente}
              onChange={handleFieldChange}
              maxLength={255}
              className="mt-2 w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </label>
        </div>

        <div>
          <label htmlFor="arreglo" className="block text-sm font-medium text-neutral-700 mb-2">
            <span>Arreglo</span>
            <textarea
              id="arreglo"
              name="arreglo"
              rows={5}
              value={formData.arreglo}
              onChange={handleFieldChange}
              maxLength={2000}
              className="mt-2 w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
            />
          </label>
        </div>

        <div>
          <label htmlFor="importe" className="block text-sm font-medium text-neutral-700 mb-2">
            <span>Importe *</span>
            <input
              id="importe"
              type="text"
              name="importe"
              inputMode="decimal"
              value={formData.importe}
              onChange={handleFieldChange}
              onBlur={handleImporteBlur}
              onFocus={(event) => event.target.select()}
              className="mt-2 w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </label>
          {errors.importe && <p className="text-sm text-danger mt-1">{errors.importe}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => navigate(listBasePath)}
            className="px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ArreglosMonthlySummariesPage() {
  const location = useLocation();
  const { entries, loading, fetchAll } = useCRUD('arreglos');

  const scope = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const rawScope = searchParams.get('scope');
    if (!rawScope || rawScope === 'all') {
      return 'all';
    }

    return normalizeFolderValue(rawScope) || 'all';
  }, [location.search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const scopedEntries = useMemo(() => {
    if (scope === 'all') {
      return entries;
    }

    return entries.filter((entry) => entry.albaran === scope);
  }, [entries, scope]);

  const quarterSummary = useMemo(() => buildArreglosQuarterSummary(scopedEntries), [scopedEntries]);

  const formatAmountWithCount = (amount, count, applyFolderSplit = true) => {
    const value = applyFolderSplit ? splitArreglosTotal(amount).folderShare : amount;
    return `${formatEuroAmount(value)} (${count})`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">
          Resumenes mensuales {scope === 'all' ? 'de Arreglos' : `de ${scope}`}
        </h1>
      </div>

      {loading && <div className="text-sm text-neutral-500 py-8 text-center">Cargando...</div>}

      {!loading && quarterSummary.annualTotal.count === 0 && (
        <div className="flex flex-col items-center py-16 text-neutral-400">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-lg font-medium">No hay datos para mostrar resúmenes mensuales</p>
        </div>
      )}

      {!loading && quarterSummary.annualTotal.count > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-sky-200 border-b border-sky-300">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600 align-middle"
                  >
                    Periodo
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap align-middle"
                  >
                    Entretelas
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap align-middle"
                  >
                    Isa
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap align-middle"
                  >
                    Loli
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap align-middle"
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {quarterSummary.quarters.map((quarter) => (
                  <React.Fragment key={quarter.key}>
                    <tr className="border-b border-neutral-100 bg-white">
                      <th
                        scope="row"
                        className="px-4 py-2.5 font-semibold text-neutral-900 align-middle"
                      >
                        {quarter.key}
                      </th>
                      <td className="px-4 py-2.5 text-right font-semibold text-neutral-900 whitespace-nowrap align-middle">
                        {formatAmountWithCount(
                          quarter.folders.Entretelas.amount,
                          quarter.folders.Entretelas.count
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-neutral-900 whitespace-nowrap align-middle">
                        {formatAmountWithCount(
                          quarter.folders.Isa.amount,
                          quarter.folders.Isa.count
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-neutral-900 whitespace-nowrap align-middle">
                        {formatAmountWithCount(
                          quarter.folders.Loli.amount,
                          quarter.folders.Loli.count
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-neutral-900 whitespace-nowrap align-middle">
                        {formatAmountWithCount(quarter.total.amount, quarter.total.count, false)}
                      </td>
                    </tr>
                    {quarter.months.map((month) => (
                      <tr
                        key={`${quarter.key}-${month.monthIndex}`}
                        className="border-b border-neutral-100 bg-white/70"
                      >
                        <th
                          scope="row"
                          className="px-4 py-2 pl-8 text-xs font-medium text-neutral-500 align-middle"
                        >
                          {month.label}
                        </th>
                        <td className="px-4 py-2 text-right text-xs font-medium text-neutral-500 whitespace-nowrap align-middle">
                          {formatAmountWithCount(
                            month.folders.Entretelas.amount,
                            month.folders.Entretelas.count
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-medium text-neutral-500 whitespace-nowrap align-middle">
                          {formatAmountWithCount(month.folders.Isa.amount, month.folders.Isa.count)}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-medium text-neutral-500 whitespace-nowrap align-middle">
                          {formatAmountWithCount(
                            month.folders.Loli.amount,
                            month.folders.Loli.count
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-medium text-neutral-500 whitespace-nowrap align-middle">
                          {formatAmountWithCount(month.total.amount, month.total.count, false)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                <tr className="border-t border-sky-300 bg-sky-50">
                  <th scope="row" className="px-4 py-2.5 font-semibold text-primary align-middle">
                    Total anual
                  </th>
                  <td className="px-4 py-2.5 text-right font-semibold text-primary whitespace-nowrap align-middle">
                    {formatAmountWithCount(
                      quarterSummary.quarters.reduce(
                        (sum, quarter) => sum + quarter.folders.Entretelas.amount,
                        0
                      ),
                      quarterSummary.quarters.reduce(
                        (sum, quarter) => sum + quarter.folders.Entretelas.count,
                        0
                      )
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-primary whitespace-nowrap align-middle">
                    {formatAmountWithCount(
                      quarterSummary.quarters.reduce(
                        (sum, quarter) => sum + quarter.folders.Isa.amount,
                        0
                      ),
                      quarterSummary.quarters.reduce(
                        (sum, quarter) => sum + quarter.folders.Isa.count,
                        0
                      )
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-primary whitespace-nowrap align-middle">
                    {formatAmountWithCount(
                      quarterSummary.quarters.reduce(
                        (sum, quarter) => sum + quarter.folders.Loli.amount,
                        0
                      ),
                      quarterSummary.quarters.reduce(
                        (sum, quarter) => sum + quarter.folders.Loli.count,
                        0
                      )
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-primary whitespace-nowrap align-middle">
                    {formatAmountWithCount(
                      quarterSummary.annualTotal.amount,
                      quarterSummary.annualTotal.count,
                      false
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ArreglosList() {
  const location = useLocation();
  const { id } = useParams();
  const isMonthlySummaryRoute = location.pathname.includes('/resumenes-mensuales');
  const isNewRoute = location.pathname.endsWith('/nueva');

  if (isMonthlySummaryRoute) {
    return <ArreglosMonthlySummariesPage />;
  }

  if (isNewRoute || id) {
    return <ArreglosForm />;
  }

  return <ArreglosListView />;
}

export default ArreglosList;
