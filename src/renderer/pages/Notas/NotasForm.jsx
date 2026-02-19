import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useNotasStore from '../../store/notas';
import useToast from '../../hooks/useToast';

function NotasForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const { notas, create, update } = useNotasStore();

  const isEdit = id && id !== 'nueva';
  const existingNota = isEdit ? notas.find((n) => n.id === parseInt(id, 10)) : null;

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    contacto: '',
    urgente: false,
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  const autosaveKey = `autosave-notas-${id || 'new'}`;

  // Load existing nota or autosave on mount
  useEffect(() => {
    if (isEdit && existingNota) {
      setFormData({
        nombre: existingNota.nombre || '',
        descripcion: existingNota.descripcion || '',
        contacto: existingNota.contacto || '',
        urgente: Boolean(existingNota.urgente),
      });
    } else {
      // Try to restore autosave
      const saved = localStorage.getItem(autosaveKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormData(parsed);
        } catch (e) {
          console.error('Error parsing autosave:', e);
        }
      }
    }
  }, [isEdit, existingNota, autosaveKey]);

  // Autosave with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(autosaveKey, JSON.stringify(formData));
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, autosaveKey]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};

    if (formData.nombre && formData.nombre.length > 255) {
      newErrors.nombre = 'El nombre debe tener máximo 255 caracteres';
    }

    if (formData.descripcion && formData.descripcion.length > 5000) {
      newErrors.descripcion = 'La descripción debe tener máximo 5000 caracteres';
    }

    if (formData.contacto && formData.contacto.length > 255) {
      newErrors.contacto = 'El contacto debe tener máximo 255 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSaving(true);

    // Trim whitespace
    const trimmedData = {
      nombre: formData.nombre.trim() || null,
      descripcion: formData.descripcion.trim() || null,
      contacto: formData.contacto.trim() || null,
      urgente: formData.urgente,
    };

    let result;
    if (isEdit) {
      result = await update(parseInt(id, 10), trimmedData, showToast);
    } else {
      result = await create(trimmedData, showToast);
    }

    setIsSaving(false);

    if (result) {
      // Clear autosave on successful save
      localStorage.removeItem(autosaveKey);
      navigate('/notas');
    }
  };

  const handleCancel = () => {
    // Clear autosave on cancel
    localStorage.removeItem(autosaveKey);
    navigate('/notas');
  };

  const getCharacterCount = (field, max) => {
    const current = formData[field].length;
    const percentage = (current / max) * 100;
    if (percentage > 80) {
      return (
        <span className="text-xs text-neutral-500 mt-1">
          {current} / {max} caracteres
        </span>
      );
    }
    return null;
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
          {isEdit ? 'Editar nota' : 'Nueva nota'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-neutral-700 mb-2">
            Nombre
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            maxLength={255}
            className="w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.nombre && <p className="text-sm text-danger mt-1">{errors.nombre}</p>}
          {getCharacterCount('nombre', 255)}
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-neutral-700 mb-2">
            Descripción
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            maxLength={5000}
            rows={6}
            className="w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
          />
          {errors.descripcion && <p className="text-sm text-danger mt-1">{errors.descripcion}</p>}
          {getCharacterCount('descripcion', 5000)}
        </div>

        {/* Contacto */}
        <div>
          <label htmlFor="contacto" className="block text-sm font-medium text-neutral-700 mb-2">
            Contacto
          </label>
          <input
            type="text"
            id="contacto"
            name="contacto"
            value={formData.contacto}
            onChange={handleChange}
            maxLength={255}
            className="w-full px-4 py-2 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.contacto && <p className="text-sm text-danger mt-1">{errors.contacto}</p>}
          {getCharacterCount('contacto', 255)}
        </div>

        {/* Urgente checkbox */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
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

        {/* Actions */}
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
    </div>
  );
}

export default NotasForm;
