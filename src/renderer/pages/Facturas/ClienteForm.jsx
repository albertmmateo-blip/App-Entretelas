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
    () => (isEdit ? entries.find((c) => Number(c.id) === Number.parseInt(clienteId, 10)) : null),
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
      {
        name: 'descuento_porcentaje',
        label: 'Descuento',
        type: 'select',
        required: true,
        options: [
          { value: '0', label: 'Sin descuento' },
          { value: '8', label: '8%' },
          { value: '10', label: '10%' },
          { value: '20', label: '20% (Personal)' },
        ],
      },
      { name: 'nif', label: 'NIF', type: 'text', required: false, maxLength: 20 },
      { name: 'direccion', label: 'Dirección', type: 'text', required: false, maxLength: 255 },
    ],
    []
  );

  const initialValues = useMemo(() => {
    if (existingCliente) {
      return {
        ...existingCliente,
        descuento_porcentaje: String(existingCliente.descuento_porcentaje ?? 0),
      };
    }

    return {
      razon_social: '',
      numero_cliente: '',
      descuento_porcentaje: '0',
      nif: '',
      direccion: '',
    };
  }, [existingCliente]);

  const handleSubmit = async (values) => {
    const parsedDescuento = Number.parseInt(values.descuento_porcentaje, 10);

    const payload = {
      razon_social: values.razon_social,
      numero_cliente: values.numero_cliente,
      descuento_porcentaje: Number.isInteger(parsedDescuento) ? parsedDescuento : 0,
      nif: values.nif || null,
      direccion: values.direccion || null,
    };

    if (isEdit) {
      const result = await update(parseInt(clienteId, 10), payload);
      if (result) {
        await fetchAll();
        navigate(`/contabilidad/venta/${clienteId}`);
      }
      return result;
    }

    const result = await create(payload);
    if (result) {
      await fetchAll();
      navigate('/contabilidad/venta');
    }
    return result;
  };

  const handleCancel = () => {
    navigate(isEdit ? `/contabilidad/venta/${clienteId}` : '/contabilidad/venta');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center">
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">
          {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
        </h1>
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            ← Volver
          </button>
        </div>
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
            sectionLabel="Facturas"
            fileLabel="Factura"
          />
        )}
      </div>
    </div>
  );
}

export default ClienteForm;
