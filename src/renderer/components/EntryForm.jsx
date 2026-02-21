import React, { useEffect, useMemo, useRef, useState } from 'react';

function EntryForm({ fields, initialValues = {}, onSubmit, onCancel, showUrgenteToggle = false }) {
  const [formData, setFormData] = useState(() => {
    const base = fields.reduce((acc, field) => {
      const initial = initialValues[field.name];
      acc[field.name] = initial === null || initial === undefined ? '' : initial;
      return acc;
    }, {});

    if (showUrgenteToggle) {
      base.urgente = Boolean(initialValues.urgente);
    }

    return base;
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  const storageKey = useMemo(() => {
    const fieldKey = fields.map((f) => f.name).join('-');
    const identifier = initialValues?.id ?? 'new';
    return `entry-form-${fieldKey}-${identifier}`;
  }, [fields, initialValues?.id]);

  useEffect(() => {
    setFormData((prev) => {
      const next = { ...prev };
      fields.forEach((field) => {
        const initial = initialValues[field.name];
        next[field.name] = initial === null || initial === undefined ? '' : initial;
      });

      if (showUrgenteToggle) {
        next.urgente = Boolean(initialValues.urgente);
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialValues)]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error parsing autosave:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, storageKey]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};

    fields.forEach((field) => {
      const value = formData[field.name];
      const trimmed = typeof value === 'string' ? value.trim() : value;

      if (field.required && (!trimmed || trimmed.length === 0)) {
        newErrors[field.name] = 'Este campo es obligatorio';
      }

      if (field.maxLength && typeof trimmed === 'string' && trimmed.length > field.maxLength) {
        newErrors[field.name] = `Debe tener máximo ${field.maxLength} caracteres`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);

    const payload = fields.reduce((acc, field) => {
      const value = formData[field.name];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        acc[field.name] = trimmed === '' ? null : trimmed;
      } else {
        acc[field.name] = value;
      }
      return acc;
    }, {});

    if (showUrgenteToggle) {
      payload.urgente = Boolean(formData.urgente);
    }

    const result = await onSubmit(payload);
    setIsSaving(false);

    if (result) {
      localStorage.removeItem(storageKey);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem(storageKey);
    onCancel();
  };

  const getCharacterCount = (fieldName, max) => {
    const current = formData[fieldName]?.length || 0;
    const percentage = (current / max) * 100;
    if (percentage < 80) return null;
    return (
      <span className="text-xs text-neutral-500 mt-1">
        {current} / {max} caracteres
      </span>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-100 rounded-lg shadow p-6 space-y-6">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-medium text-neutral-700 mb-2">
            {field.label}
            {field.required ? ' *' : ''}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              maxLength={field.maxLength}
              rows={6}
              className="w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
            />
          ) : (
            <input
              type={field.type || 'text'}
              id={field.name}
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              required={field.required}
              maxLength={field.maxLength}
              className="w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          )}
          {errors[field.name] && <p className="text-sm text-danger mt-1">{errors[field.name]}</p>}
          {field.maxLength && getCharacterCount(field.name, field.maxLength)}
        </div>
      ))}

      {showUrgenteToggle && (
        <div>
          <label htmlFor="urgente" className="flex items-center gap-2 cursor-pointer">
            <input
              id="urgente"
              type="checkbox"
              name="urgente"
              checked={formData.urgente}
              onChange={handleChange}
              className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-2 focus:ring-primary"
            />
            <span
              className={`text-sm font-medium ${formData.urgente ? 'text-danger' : 'text-neutral-700'}`}
            >
              Marcar como URGENTE!
            </span>
          </label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

export default EntryForm;
