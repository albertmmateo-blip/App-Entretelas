import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EntryForm from '../../components/EntryForm';
import PDFUploadSection from '../../components/PDFUploadSection';
import useCRUD from '../../hooks/useCRUD';

function ProveedorForm({ basePath = '/facturas/compra', showPDFSection = true }) {
  const navigate = useNavigate();
  const { proveedorId } = useParams();
  const isEdit = proveedorId && proveedorId !== 'nuevo';
  const { entries, create, update, fetchAll } = useCRUD('proveedores');

  useEffect(() => {
    if (isEdit && entries.length === 0) {
      fetchAll();
    }
  }, [entries.length, fetchAll, isEdit]);

  const existingProveedor = useMemo(
    () => (isEdit ? entries.find((p) => p.id === parseInt(proveedorId, 10)) : null),
    [entries, proveedorId, isEdit]
  );

  const fields = useMemo(
    () => [
      { name: 'razon_social', label: 'Razón Social', type: 'text', required: true, maxLength: 255 },
      { name: 'nif', label: 'NIF', type: 'text', required: false, maxLength: 20 },
      { name: 'direccion', label: 'Dirección', type: 'text', required: false, maxLength: 255 },
    ],
    []
  );

  const initialValues = useMemo(
    () =>
      existingProveedor || {
        razon_social: '',
        nif: '',
        direccion: '',
      },
    [existingProveedor]
  );

  const handleSubmit = async (values) => {
    const payload = {
      razon_social: values.razon_social,
      nif: values.nif || null,
      direccion: values.direccion || null,
    };

    if (isEdit) {
      const result = await update(parseInt(proveedorId, 10), payload);
      if (result) navigate(`${basePath}/${proveedorId}`);
      return result;
    }

    const result = await create(payload);
    if (result) navigate(basePath);
    return result;
  };

  const handleCancel = () => {
    navigate(isEdit ? `${basePath}/${proveedorId}` : basePath);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={handleCancel}
          className="text-primary hover:text-primary/80 flex items-center gap-1 mb-2"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-neutral-900">
          {isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
        </h1>
      </div>

      <div className="space-y-6">
        <EntryForm
          fields={fields}
          initialValues={{ ...initialValues, id: existingProveedor?.id }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          showUrgenteToggle={false}
        />

        {showPDFSection && isEdit && existingProveedor && (
          <PDFUploadSection
            tipo="compra"
            entidadId={existingProveedor.id}
            entidadNombre={existingProveedor.razon_social}
          />
        )}
      </div>
    </div>
  );
}

export default ProveedorForm;
