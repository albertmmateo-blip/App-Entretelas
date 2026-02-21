import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EntryForm from '../../components/EntryForm';
import useCRUD from '../../hooks/useCRUD';

function EncargarForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = id && id !== 'nueva';
  const { entries, create, update, fetchAll } = useCRUD('encargar');
  const {
    entries: proveedores,
    fetchAll: fetchProveedores,
    loading: proveedoresLoading,
  } = useCRUD('proveedores');

  useEffect(() => {
    if (isEdit && entries.length === 0) {
      fetchAll();
    }
  }, [entries.length, fetchAll, isEdit]);

  useEffect(() => {
    if (proveedores.length === 0) {
      fetchProveedores();
    }
  }, [fetchProveedores, proveedores.length]);

  const existingEncargar = useMemo(
    () => (isEdit ? entries.find((e) => e.id === parseInt(id, 10)) : null),
    [entries, id, isEdit]
  );

  const fields = useMemo(
    () => [
      {
        name: 'proveedor_id',
        label: 'Carpeta proveedor',
        type: 'select',
        required: true,
        placeholder: 'Selecciona una carpeta',
        options: proveedores.map((proveedor) => ({
          value: String(proveedor.id),
          label: proveedor.razon_social,
        })),
      },
      { name: 'articulo', label: 'Artículo', type: 'text', required: true, maxLength: 255 },
      { name: 'ref_interna', label: 'Ref. Interna', type: 'text', required: false, maxLength: 255 },
      {
        name: 'descripcion',
        label: 'Descripción',
        type: 'textarea',
        required: false,
        maxLength: 5000,
      },
      {
        name: 'ref_proveedor',
        label: 'Ref. Proveedor',
        type: 'text',
        required: false,
        maxLength: 255,
      },
    ],
    [proveedores]
  );

  const initialValues = useMemo(
    () =>
      existingEncargar || {
        proveedor_id: '',
        articulo: '',
        ref_interna: '',
        descripcion: '',
        ref_proveedor: '',
        urgente: false,
      },
    [existingEncargar]
  );

  const handleSubmit = async (values) => {
    const proveedorId = Number(values.proveedor_id);

    if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
      return null;
    }

    const payload = {
      ...values,
      proveedor_id: proveedorId,
      urgente: Boolean(values.urgente),
    };

    if (isEdit) {
      const result = await update(parseInt(id, 10), payload);
      if (result) navigate('/encargar');
      return result;
    }

    const result = await create(payload);
    if (result) navigate('/encargar');
    return result;
  };

  const handleCancel = () => {
    navigate('/encargar');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center">
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">
          {isEdit ? 'Editar entrada' : 'Nueva entrada'}
        </h1>
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>

      {!proveedoresLoading && proveedores.length === 0 && (
        <div className="mb-4 rounded border border-neutral-200 bg-neutral-100 p-3 text-sm text-neutral-700">
          No hay carpetas de proveedores todavía.{' '}
          <button
            type="button"
            onClick={() => navigate('/encargar/proveedor/nuevo')}
            className="text-primary hover:text-primary/80"
          >
            Crear carpeta
          </button>
        </div>
      )}

      <EntryForm
        fields={fields}
        initialValues={{
          ...initialValues,
          proveedor_id:
            initialValues.proveedor_id === null || initialValues.proveedor_id === undefined
              ? ''
              : String(initialValues.proveedor_id),
          id: existingEncargar?.id,
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        showUrgenteToggle
      />
    </div>
  );
}

export default EncargarForm;
