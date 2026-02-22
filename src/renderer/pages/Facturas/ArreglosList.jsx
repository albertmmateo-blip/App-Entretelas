import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import useCRUD from '../../hooks/useCRUD';
import { formatEuroAmount, parseEuroAmount } from '../../utils/euroAmount';

const ALBARAN_OPTIONS = ['Entretelas', 'Isa', 'Loli'];

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

function ArreglosListView() {
  const navigate = useNavigate();
  const { entries, loading, fetchAll, delete: deleteArreglo } = useCRUD('arreglos');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return entries;
    }

    const query = searchQuery.toLowerCase();
    return entries.filter((entry) => {
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
  }, [entries, searchQuery]);

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
            onClick={() => navigate('/contabilidad/arreglos/nueva')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            + Nueva entrada
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
        <input
          type="search"
          placeholder="Buscar en arreglos..."
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
          onRowClick={(row) => navigate(`/contabilidad/arreglos/${row.id}`)}
          initialSort={{ key: 'fecha', direction: 'desc' }}
          renderActions={(row) => [
            {
              label: 'Editar',
              onClick: () => navigate(`/contabilidad/arreglos/${row.id}`),
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
  const { id } = useParams();
  const isEdit = id && id !== 'nueva';
  const { entries, fetchAll, create, update } = useCRUD('arreglos');
  const existingEntry = useMemo(
    () => (isEdit ? entries.find((entry) => entry.id === parseInt(id, 10)) : null),
    [entries, id, isEdit]
  );

  const [formData, setFormData] = useState({
    albaran: 'Entretelas',
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
      navigate('/contabilidad/arreglos');
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
            onClick={() => navigate('/contabilidad/arreglos')}
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
              placeholder="0.00 €"
              value={formData.importe}
              onChange={handleFieldChange}
              onBlur={handleImporteBlur}
              className="mt-2 w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </label>
          {errors.importe && <p className="text-sm text-danger mt-1">{errors.importe}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => navigate('/contabilidad/arreglos')}
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

function ArreglosList() {
  const location = useLocation();
  const { id } = useParams();
  const isNewRoute = location.pathname.endsWith('/nueva');

  if (isNewRoute || id) {
    return <ArreglosForm />;
  }

  return <ArreglosListView />;
}

export default ArreglosList;
