import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EntryForm from '../../components/EntryForm';
import PDFUploadSection from '../../components/PDFUploadSection';
import useCRUD from '../../hooks/useCRUD';

function ClienteForm() {
  const navigate = useNavigate();
  const { clienteId } = useParams();
  const isEdit = clienteId && clienteId !== 'nuevo';
  const { entries, create, update, fetchAll } = useCRUD('clientes');

  useEffect(() => {
    if (isEdit && entries.length === 0) {
      fetchAll();
    }
  }, [entries.length, fetchAll, isEdit]);

  const existingCliente = useMemo(
    () => (isEdit ? entries.find((c) => c.id === parseInt(clienteId, 10)) : null),
    [entries, clienteId, isEdit]
  );

  const fields = useMemo(
    () => [
      { name: 'razon_social', label: 'Razón Social', type: 'text', required: true, maxLength: 255 },
      {
        name: 'numero_cliente',
        label: 'Número de Cliente',
        type: 'text',
        required: true,
        maxLength: 50,
      },
      { name: 'nif', label: 'NIF', type: 'text', required: false, maxLength: 20 },
      { name: 'direccion', label: 'Dirección', type: 'text', required: false, maxLength: 255 },
    ],
    []
  );

  const initialValues = useMemo(
    () =>
      existingCliente || {
        razon_social: '',
        numero_cliente: '',
        nif: '',
        direccion: '',
      },
    [existingCliente]
  );

  const handleSubmit = async (values) => {
    const payload = {
      razon_social: values.razon_social,
      numero_cliente: values.numero_cliente,
      nif: values.nif || null,
      direccion: values.direccion || null,
    };

    if (isEdit) {
      const result = await update(parseInt(clienteId, 10), payload);
      if (result) navigate(`/facturas/venta/${clienteId}`);
      return result;
    }

    const result = await create(payload);
    if (result) navigate('/facturas/venta');
    return result;
  };

  const handleCancel = () => {
    navigate(isEdit ? `/facturas/venta/${clienteId}` : '/facturas/venta');
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
          {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
        </h1>
      </div>

      <div className="space-y-6">
        <EntryForm
          fields={fields}
          initialValues={{ ...initialValues, id: existingCliente?.id }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          showUrgenteToggle={false}
        />

        {isEdit && existingCliente && (
          <PDFUploadSection
            tipo="venta"
            entidadId={existingCliente.id}
            entidadNombre={existingCliente.razon_social}
          />
        )}
      </div>
    </div>
  );
}

export default ClienteForm;
