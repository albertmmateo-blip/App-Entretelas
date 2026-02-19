import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EntryForm from '../../components/EntryForm';
import useCRUD from '../../hooks/useCRUD';

function LlamarForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = id && id !== 'nueva';
  const { entries, create, update, fetchAll } = useCRUD('llamar');

  useEffect(() => {
    if (isEdit && entries.length === 0) {
      fetchAll();
    }
  }, [entries.length, fetchAll, isEdit]);

  const existingLlamar = useMemo(
    () => (isEdit ? entries.find((l) => l.id === parseInt(id, 10)) : null),
    [entries, id, isEdit]
  );

  const fields = useMemo(
    () => [
      { name: 'asunto', label: 'Asunto', type: 'text', required: true, maxLength: 255 },
      { name: 'contacto', label: 'Contacto', type: 'text', required: true, maxLength: 255 },
      { name: 'nombre', label: 'Nombre', type: 'text', required: false, maxLength: 255 },
      {
        name: 'descripcion',
        label: 'Descripción',
        type: 'textarea',
        required: false,
        maxLength: 5000,
      },
    ],
    []
  );

  const initialValues = useMemo(
    () =>
      existingLlamar || {
        asunto: '',
        contacto: '',
        nombre: '',
        descripcion: '',
        urgente: false,
      },
    [existingLlamar]
  );

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      urgente: Boolean(values.urgente),
    };

    if (isEdit) {
      const result = await update(parseInt(id, 10), payload);
      if (result) navigate('/llamar');
      return result;
    }

    const result = await create(payload);
    if (result) navigate('/llamar');
    return result;
  };

  const handleCancel = () => {
    navigate('/llamar');
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
          {isEdit ? 'Editar entrada' : 'Nueva entrada'}
        </h1>
      </div>

      <EntryForm
        fields={fields}
        initialValues={{ ...initialValues, id: existingLlamar?.id }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        showUrgenteToggle
      />
    </div>
  );
}

export default LlamarForm;
