import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';

// ─────────────────────────────────────────────────────────────────────────────
// Data hook
// ─────────────────────────────────────────────────────────────────────────────

const initialState = {
  lugares: [], // each: { id, nombre, descripcion, compartimentos: [{id, nombre, descripcion, orden}] }
  productos: [], // each: { id, nombre, descripcion, ref, asignaciones: [{...joins}], articulos: [{id, producto_id, nombre, ref, descripcion, lugar_id, compartimento_id, lugar_nombre, compartimento_nombre, notas}] }
  loading: false,
  error: null,
};

const byNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es-ES', { sensitivity: 'base' });

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.value, loading: false };
    case 'SET_LUGARES':
      return { ...state, lugares: action.value };
    case 'SET_PRODUCTOS':
      return { ...state, productos: action.value };

    case 'ADD_LUGAR':
      return {
        ...state,
        lugares: [...state.lugares, { compartimentos: [], ...action.value }].sort(byNombre),
      };
    case 'UPDATE_LUGAR':
      return {
        ...state,
        lugares: state.lugares
          .map((l) => (l.id === action.value.id ? action.value : l))
          .sort(byNombre),
      };
    case 'DELETE_LUGAR':
      return {
        ...state,
        lugares: state.lugares.filter((l) => l.id !== action.id),
        productos: state.productos.map((p) => ({
          ...p,
          asignaciones: p.asignaciones.filter((a) => a.lugar_id !== action.id),
          articulos: (p.articulos || []).map((a) =>
            a.lugar_id === action.id
              ? {
                  ...a,
                  lugar_id: null,
                  lugar_nombre: null,
                  compartimento_id: null,
                  compartimento_nombre: null,
                }
              : a
          ),
        })),
      };

    case 'ADD_COMPARTIMENTO': {
      const lugares = state.lugares.map((l) => {
        if (l.id !== action.value.lugar_id) return l;
        return { ...l, compartimentos: [...l.compartimentos, action.value] };
      });
      return { ...state, lugares };
    }
    case 'UPDATE_COMPARTIMENTO': {
      const lugares = state.lugares.map((l) => ({
        ...l,
        compartimentos: l.compartimentos.map((c) => (c.id === action.value.id ? action.value : c)),
      }));
      return { ...state, lugares };
    }
    case 'DELETE_COMPARTIMENTO': {
      const lugares = state.lugares.map((l) => ({
        ...l,
        compartimentos: l.compartimentos.filter((c) => c.id !== action.id),
      }));
      const productos = state.productos.map((p) => ({
        ...p,
        asignaciones: p.asignaciones.map((a) =>
          a.compartimento_id === action.id
            ? { ...a, compartimento_id: null, compartimento_nombre: null }
            : a
        ),
        articulos: (p.articulos || []).map((a) =>
          a.compartimento_id === action.id
            ? { ...a, compartimento_id: null, compartimento_nombre: null }
            : a
        ),
      }));
      return { ...state, lugares, productos };
    }

    case 'ADD_PRODUCTO':
      return { ...state, productos: [...state.productos, action.value].sort(byNombre) };
    case 'UPDATE_PRODUCTO':
      return {
        ...state,
        productos: state.productos
          .map((p) => (p.id === action.value.id ? action.value : p))
          .sort(byNombre),
      };
    case 'DELETE_PRODUCTO':
      return { ...state, productos: state.productos.filter((p) => p.id !== action.id) };

    case 'ADD_ASIGNACION': {
      const a = action.value;
      const productos = state.productos.map((p) =>
        p.id !== a.producto_id ? p : { ...p, asignaciones: [...p.asignaciones, a] }
      );
      return { ...state, productos };
    }
    case 'UPDATE_ASIGNACION': {
      const a = action.value;
      const productos = state.productos.map((p) =>
        p.id !== a.producto_id
          ? p
          : {
              ...p,
              asignaciones: p.asignaciones.map((x) => (x.id === a.id ? a : x)),
            }
      );
      return { ...state, productos };
    }
    case 'DELETE_ASIGNACION': {
      const productos = state.productos.map((p) => ({
        ...p,
        asignaciones: p.asignaciones.filter((a) => a.id !== action.id),
      }));
      return { ...state, productos };
    }

    case 'ADD_ARTICULO': {
      const a = action.value;
      const productos = state.productos.map((p) =>
        p.id !== a.producto_id ? p : { ...p, articulos: [...(p.articulos || []), a].sort(byNombre) }
      );
      return { ...state, productos };
    }
    case 'UPDATE_ARTICULO': {
      const a = action.value;
      const productos = state.productos.map((p) =>
        p.id !== a.producto_id
          ? p
          : {
              ...p,
              articulos: (p.articulos || []).map((x) => (x.id === a.id ? a : x)),
            }
      );
      return { ...state, productos };
    }
    case 'DELETE_ARTICULO': {
      const productos = state.productos.map((p) => ({
        ...p,
        articulos: (p.articulos || []).filter((a) => a.id !== action.id),
      }));
      return { ...state, productos };
    }

    default:
      return state;
  }
}

function useGuardado() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const api = window.electronAPI?.guardado;

  const refresh = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const [lugaresRes, productosRes] = await Promise.all([api.getLugares(), api.getProductos()]);
      if (lugaresRes.success) dispatch({ type: 'SET_LUGARES', value: lugaresRes.data });
      if (productosRes.success) dispatch({ type: 'SET_PRODUCTOS', value: productosRes.data });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', value: e.message });
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, dispatch, api };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers / shared UI
// ─────────────────────────────────────────────────────────────────────────────

function locationLabel(asignacion) {
  if (!asignacion) return '';
  const { lugar_nombre: lugarNombre, compartimento_nombre: compartimentoNombre } = asignacion;
  return compartimentoNombre ? `${lugarNombre} \u2013 ${compartimentoNombre}` : lugarNombre;
}

function InlineForm({ onSubmit, onCancel, initialValues = {}, fields, submitLabel = 'Guardar' }) {
  const [values, setValues] = useState(initialValues);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {fields.map(({ key, label, placeholder, type = 'text', required }, idx) => (
        <div key={key}>
          <label htmlFor={key} className="block text-xs font-medium text-neutral-600 mb-1">
            {label}
          </label>
          {type === 'textarea' ? (
            <textarea
              id={key}
              ref={idx === 0 ? firstRef : undefined}
              value={values[key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              placeholder={placeholder}
              rows={2}
              className="w-full px-3 py-1.5 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          ) : (
            <input
              id={key}
              ref={idx === 0 ? firstRef : undefined}
              type={type}
              value={values[key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              placeholder={placeholder}
              required={required}
              className="w-full px-3 py-1.5 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          )}
        </div>
      ))}
      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm border border-neutral-200 rounded hover:bg-neutral-100 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Asignar Modal
// ─────────────────────────────────────────────────────────────────────────────

function AsignarModal({ lugares, productos, onClose, onSave, defaultProductoId = null }) {
  const [productoId, setProductoId] = useState(defaultProductoId ? String(defaultProductoId) : '');
  const [lugarId, setLugarId] = useState('');
  const [compartimentoId, setCompartimentoId] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedLugar = useMemo(
    () => lugares.find((l) => l.id === Number(lugarId)) || null,
    [lugares, lugarId]
  );

  useEffect(() => {
    setCompartimentoId('');
  }, [lugarId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productoId || !lugarId) return;
    setSaving(true);
    await onSave({
      producto_id: Number(productoId),
      lugar_id: Number(lugarId),
      compartimento_id: compartimentoId ? Number(compartimentoId) : null,
      notas: notas.trim() || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="xp-modal-overlay">
      <div className="xp-dialog w-full max-w-md mx-4">
        <div className="xp-dialog__titlebar">
          <span className="xp-dialog__titlebar-text">Asignar a ubicación</span>
        </div>
        <div className="xp-dialog__body items-stretch">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                htmlFor="asignar-producto"
                className="block text-xs font-medium text-neutral-600 mb-1"
              >
                Producto *
              </label>
              <select
                id="asignar-producto"
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Seleccionar producto...</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.ref ? ` (${p.ref})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                htmlFor="asignar-lugar"
                className="block text-xs font-medium text-neutral-600 mb-1"
              >
                Lugar *
              </label>
              <select
                id="asignar-lugar"
                value={lugarId}
                onChange={(e) => setLugarId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Seleccionar lugar...</option>
                {lugares.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </div>
            {selectedLugar?.compartimentos?.length > 0 && (
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  htmlFor="asignar-compartimento"
                  className="block text-xs font-medium text-neutral-600 mb-1"
                >
                  Compartimento
                </label>
                <select
                  id="asignar-compartimento"
                  value={compartimentoId}
                  onChange={(e) => setCompartimentoId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sin compartimento específico</option>
                  {selectedLugar.compartimentos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                htmlFor="asignar-notas"
                className="block text-xs font-medium text-neutral-600 mb-1"
              >
                Notas
              </label>
              <input
                id="asignar-notas"
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Opcional..."
                className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-100 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !productoId || !lugarId}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Asignar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Asignacion Modal
// ─────────────────────────────────────────────────────────────────────────────

function EditAsignacionModal({ asignacion, lugares, onClose, onSave }) {
  const [lugarId, setLugarId] = useState(String(asignacion.lugar_id));
  const [compartimentoId, setCompartimentoId] = useState(
    asignacion.compartimento_id ? String(asignacion.compartimento_id) : ''
  );
  const [notas, setNotas] = useState(asignacion.notas || '');
  const [saving, setSaving] = useState(false);

  const selectedLugar = useMemo(
    () => lugares.find((l) => l.id === Number(lugarId)) || null,
    [lugares, lugarId]
  );

  useEffect(() => {
    if (Number(lugarId) !== asignacion.lugar_id) setCompartimentoId('');
  }, [lugarId, asignacion.lugar_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(asignacion.id, {
      lugar_id: Number(lugarId),
      compartimento_id: compartimentoId ? Number(compartimentoId) : null,
      notas: notas.trim() || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="xp-modal-overlay">
      <div className="xp-dialog w-full max-w-md mx-4">
        <div className="xp-dialog__titlebar">
          <span className="xp-dialog__titlebar-text">Editar ubicación</span>
        </div>
        <div className="xp-dialog__body items-stretch">
          <p className="text-sm text-neutral-500 m-0">{asignacion.producto_nombre}</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                htmlFor="edit-lugar"
                className="block text-xs font-medium text-neutral-600 mb-1"
              >
                Lugar *
              </label>
              <select
                id="edit-lugar"
                value={lugarId}
                onChange={(e) => setLugarId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {lugares.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </div>
            {selectedLugar?.compartimentos?.length > 0 && (
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  htmlFor="edit-compartimento"
                  className="block text-xs font-medium text-neutral-600 mb-1"
                >
                  Compartimento
                </label>
                <select
                  id="edit-compartimento"
                  value={compartimentoId}
                  onChange={(e) => setCompartimentoId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sin compartimento específico</option>
                  {selectedLugar.compartimentos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                htmlFor="edit-notas"
                className="block text-xs font-medium text-neutral-600 mb-1"
              >
                Notas
              </label>
              <input
                id="edit-notas"
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-100 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Articulo Modal  (create / edit an artículo under a producto)
// ─────────────────────────────────────────────────────────────────────────────

function ArticuloModal({ lugares, producto, articulo = null, onClose, onSave }) {
  const [nombre, setNombre] = useState(articulo?.nombre || '');
  const [ref, setRef] = useState(articulo?.ref || '');
  const [descripcion, setDescripcion] = useState(articulo?.descripcion || '');
  const [notas, setNotas] = useState(articulo?.notas || '');
  const [lugarId, setLugarId] = useState(articulo?.lugar_id ? String(articulo.lugar_id) : '');
  const [compartimentoId, setCompartimentoId] = useState(
    articulo?.compartimento_id ? String(articulo.compartimento_id) : ''
  );
  const [saving, setSaving] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const selectedLugar = useMemo(
    () => lugares.find((l) => l.id === Number(lugarId)) || null,
    [lugares, lugarId]
  );

  useEffect(() => {
    if (!articulo || Number(lugarId) !== articulo.lugar_id) setCompartimentoId('');
  }, [lugarId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    await onSave({
      nombre: nombre.trim(),
      ref: ref.trim() || null,
      descripcion: descripcion.trim() || null,
      notas: notas.trim() || null,
      lugar_id: lugarId ? Number(lugarId) : null,
      compartimento_id: compartimentoId ? Number(compartimentoId) : null,
    });
    setSaving(false);
    onClose();
  };

  const isEditing = !!articulo;
  const btnLabel = isEditing ? 'Guardar' : 'Crear';

  return (
    <div className="xp-modal-overlay">
      <div className="xp-dialog w-full max-w-md mx-4">
        <div className="xp-dialog__titlebar">
          <span className="xp-dialog__titlebar-text">
            {isEditing ? 'Editar artículo' : 'Nuevo artículo'}
          </span>
        </div>
        <div className="xp-dialog__body items-stretch">
          <p className="text-sm text-neutral-500 m-0">{producto.nombre}</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                htmlFor="art-nombre"
                className="block text-xs font-medium text-neutral-600 mb-1"
              >
                Nombre *
              </label>
              <input
                id="art-nombre"
                ref={firstRef}
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Ej: Bies Rojo, Bies Amarillo..."
                className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  htmlFor="art-ref"
                  className="block text-xs font-medium text-neutral-600 mb-1"
                >
                  Referencia
                </label>
                <input
                  id="art-ref"
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="Opcional..."
                  className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  htmlFor="art-notas"
                  className="block text-xs font-medium text-neutral-600 mb-1"
                >
                  Notas
                </label>
                <input
                  id="art-notas"
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Opcional..."
                  className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label htmlFor="art-desc" className="block text-xs font-medium text-neutral-600 mb-1">
                Descripción
              </label>
              <textarea
                id="art-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Opcional..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>
            <div className="border-t border-neutral-100 pt-3">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                Ubicación (opcional)
              </p>
              <div className="space-y-2">
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <label
                    htmlFor="art-lugar"
                    className="block text-xs font-medium text-neutral-600 mb-1"
                  >
                    Lugar
                  </label>
                  <select
                    id="art-lugar"
                    value={lugarId}
                    onChange={(e) => setLugarId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sin ubicación asignada</option>
                    {lugares.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedLugar?.compartimentos?.length > 0 && (
                  <div>
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label
                      htmlFor="art-compartimento"
                      className="block text-xs font-medium text-neutral-600 mb-1"
                    >
                      Compartimento
                    </label>
                    <select
                      id="art-compartimento"
                      value={compartimentoId}
                      onChange={(e) => setCompartimentoId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Sin compartimento específico</option>
                      {selectedLugar.compartimentos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-100 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !nombre.trim()}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
              >
                {saving ? 'Guardando...' : btnLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Buscar
// ─────────────────────────────────────────────────────────────────────────────

function TabBuscar({ state, dispatch, api }) {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('producto');
  const [editingAsignacion, setEditingAsignacion] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingArticulo, setEditingArticulo] = useState(null);
  const [confirmDeleteArticulo, setConfirmDeleteArticulo] = useState(null);
  const [expandedProductos, setExpandedProductos] = useState(new Set());
  const [highlightedLugar, setHighlightedLugar] = useState(null);

  const q = query.trim().toLowerCase();

  const toggleProducto = useCallback((id) => {
    setExpandedProductos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const navigateToLugar = useCallback((lugarId) => {
    setViewMode('lugar');
    setHighlightedLugar(lugarId);
  }, []);

  useEffect(() => {
    if (!highlightedLugar || viewMode !== 'lugar') return undefined;
    const el = document.getElementById(`lugar-${highlightedLugar}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const timer = setTimeout(() => setHighlightedLugar(null), 1500);
    return () => clearTimeout(timer);
  }, [highlightedLugar, viewMode]);

  // Products that have asignaciones or articulos, filtered by search query
  const filteredProductos = useMemo(() => {
    return state.productos.filter((p) => {
      const arts = p.articulos || [];
      const hasContent = p.asignaciones.length > 0 || arts.length > 0;
      if (!hasContent) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.ref && p.ref.toLowerCase().includes(q)) ||
        p.asignaciones.some(
          (a) =>
            a.lugar_nombre?.toLowerCase().includes(q) ||
            a.compartimento_nombre?.toLowerCase().includes(q) ||
            a.notas?.toLowerCase().includes(q)
        ) ||
        arts.some(
          (a) =>
            a.nombre.toLowerCase().includes(q) ||
            (a.ref && a.ref.toLowerCase().includes(q)) ||
            a.lugar_nombre?.toLowerCase().includes(q) ||
            a.compartimento_nombre?.toLowerCase().includes(q) ||
            a.notas?.toLowerCase().includes(q)
        )
      );
    });
  }, [state.productos, q]);

  // Por-lugar view: flat map of lugar → items (both asignaciones + articulos)
  const byLugar = useMemo(() => {
    const map = {};
    for (const p of state.productos) {
      for (const a of p.asignaciones) {
        if (
          q &&
          !p.nombre.toLowerCase().includes(q) &&
          !p.ref?.toLowerCase().includes(q) &&
          !a.lugar_nombre?.toLowerCase().includes(q) &&
          !a.compartimento_nombre?.toLowerCase().includes(q) &&
          !a.notas?.toLowerCase().includes(q)
        )
          continue;
        const key = String(a.lugar_id);
        if (!map[key]) map[key] = { nombre: a.lugar_nombre, items: [] };
        map[key].items.push({
          itemKind: 'asignacion',
          ...a,
          producto_nombre: p.nombre,
          producto_ref: p.ref,
        });
      }
      for (const art of p.articulos || []) {
        if (!art.lugar_id) continue;
        if (
          q &&
          !p.nombre.toLowerCase().includes(q) &&
          !art.nombre.toLowerCase().includes(q) &&
          !art.ref?.toLowerCase().includes(q) &&
          !art.lugar_nombre?.toLowerCase().includes(q) &&
          !art.compartimento_nombre?.toLowerCase().includes(q) &&
          !art.notas?.toLowerCase().includes(q)
        )
          continue;
        const key = String(art.lugar_id);
        if (!map[key]) map[key] = { nombre: art.lugar_nombre, items: [] };
        map[key].items.push({
          itemKind: 'articulo',
          ...art,
          producto_nombre: p.nombre,
          producto_ref: p.ref,
        });
      }
    }
    return Object.entries(map).sort(([, a], [, b]) =>
      a.nombre.localeCompare(b.nombre, 'es-ES', { sensitivity: 'base' })
    );
  }, [state.productos, q]);

  const totalItems = useMemo(() => {
    let count = 0;
    for (const p of state.productos) {
      count += p.asignaciones.length + (p.articulos?.length || 0);
    }
    return count;
  }, [state.productos]);

  const handleDeleteAsignacion = async () => {
    if (!confirmDelete) return;
    const res = await api.deleteAsignacion(confirmDelete);
    if (res.success) dispatch({ type: 'DELETE_ASIGNACION', id: confirmDelete });
    setConfirmDelete(null);
  };

  const handleUpdateAsignacion = async (id, data) => {
    const res = await api.updateAsignacion(id, data);
    if (res.success) dispatch({ type: 'UPDATE_ASIGNACION', value: res.data });
  };

  const handleDeleteArticulo = async () => {
    if (!confirmDeleteArticulo) return;
    const res = await api.deleteArticulo(confirmDeleteArticulo);
    if (res.success) dispatch({ type: 'DELETE_ARTICULO', id: confirmDeleteArticulo });
    setConfirmDeleteArticulo(null);
  };

  const handleUpdateArticulo = async (data) => {
    if (!editingArticulo) return;
    const res = await api.updateArticulo(editingArticulo.id, data);
    if (res.success) dispatch({ type: 'UPDATE_ARTICULO', value: res.data });
  };

  return (
    <div>
      {/* Search */}
      <div className="flex gap-3 mb-4 items-center">
        <input
          type="search"
          placeholder="Buscar por producto, artículo, lugar o notas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* View mode toggle */}
      <div className="flex gap-1 mb-5 border-b border-neutral-200">
        {[
          ['producto', 'Por producto'],
          ['lugar', 'Por lugar'],
        ].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              viewMode === mode
                ? 'border-primary text-primary-700'
                : 'border-transparent text-primary/80 hover:text-primary-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {totalItems === 0 && (
        <div className="text-center py-16 text-neutral-500">
          <div className="text-5xl mb-3">📍</div>
          <p className="text-base">Todavía no hay nada asignado.</p>
          <p className="text-sm mt-1">
            Crea productos y lugares, luego asígnalos o añade artículos.
          </p>
        </div>
      )}

      {totalItems > 0 && filteredProductos.length === 0 && viewMode === 'producto' && (
        <div className="text-center py-12 text-neutral-500">Sin resultados.</div>
      )}
      {totalItems > 0 && byLugar.length === 0 && viewMode === 'lugar' && (
        <div className="text-center py-12 text-neutral-500">Sin resultados.</div>
      )}

      {/* ── POR PRODUCTO ── 3-level expandable tree */}
      {filteredProductos.length > 0 && viewMode === 'producto' && (
        <div className="space-y-2">
          {filteredProductos.map((producto) => {
            const articulos = producto.articulos || [];
            const hasArticulos = articulos.length > 0;
            const isExpanded = expandedProductos.has(producto.id);

            if (hasArticulos) {
              // Products WITH artículos: Level 1 (product) → Level 2 (artículo + clickable location)
              const assignedCount = new Set(
                articulos.filter((a) => a.lugar_id).map((a) => a.lugar_id)
              ).size;

              return (
                <div
                  key={producto.id}
                  className="border border-neutral-200 rounded overflow-hidden"
                >
                  {/* Level 1: Producto row */}
                  <button
                    type="button"
                    onClick={() => toggleProducto(producto.id)}
                    className="w-full px-4 py-2.5 bg-neutral-50 flex items-center gap-2 hover:bg-neutral-100 transition-colors text-left"
                  >
                    <span
                      className="text-neutral-400 text-xs select-none transition-transform duration-150"
                      style={{
                        display: 'inline-block',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▶
                    </span>
                    <span className="font-semibold text-neutral-900 flex-1">{producto.nombre}</span>
                    {producto.ref && (
                      <span className="text-xs text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded">
                        {producto.ref}
                      </span>
                    )}
                    <span className="text-xs text-neutral-500">
                      {articulos.length} {articulos.length !== 1 ? 'artículos' : 'artículo'}
                      {assignedCount > 0 && (
                        <span className="text-neutral-400">
                          {' '}
                          · {assignedCount} {assignedCount !== 1 ? 'ubicaciones' : 'ubicación'}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Level 2: Each artículo with its clickable location */}
                  {isExpanded && (
                    <div className="border-t border-neutral-200 divide-y divide-neutral-100">
                      {articulos.map((art) => {
                        const locLabel = art.compartimento_nombre
                          ? `${art.lugar_nombre} – ${art.compartimento_nombre}`
                          : art.lugar_nombre;

                        return (
                          <div
                            key={art.id}
                            className="flex items-center gap-2 pl-8 pr-4 py-2 hover:bg-neutral-50 transition-colors group"
                          >
                            <span className="flex-1 text-sm text-neutral-800 font-medium">
                              {art.nombre}
                            </span>
                            {art.ref && (
                              <span className="text-xs text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                                {art.ref}
                              </span>
                            )}
                            {art.notas && (
                              <span className="text-xs text-neutral-400 italic">{art.notas}</span>
                            )}
                            {art.lugar_id ? (
                              <button
                                type="button"
                                onClick={() => navigateToLugar(art.lugar_id)}
                                className="text-xs text-primary/80 hover:text-primary flex items-center gap-1 px-2 py-0.5 rounded border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-colors shrink-0"
                                title="Ir al lugar"
                              >
                                <span>📍</span>
                                <span>{locLabel}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-neutral-400 italic shrink-0">
                                Sin ubicación
                              </span>
                            )}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingArticulo(art)}
                                className="px-2 py-1 text-xs border border-neutral-200 rounded hover:bg-neutral-100 transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteArticulo(art.id)}
                                className="px-2 py-1 text-xs border border-danger/30 text-danger rounded hover:bg-danger/5 transition-colors"
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            // Products WITHOUT artículos: collapsible list of asignaciones (Level 1+2)
            const hasAsignaciones = producto.asignaciones.length > 0;
            return (
              <div key={producto.id} className="border border-neutral-200 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => hasAsignaciones && toggleProducto(producto.id)}
                  className={`w-full px-4 py-2.5 bg-neutral-50 flex items-center gap-2 text-left ${
                    hasAsignaciones
                      ? 'hover:bg-neutral-100 transition-colors cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  {hasAsignaciones && (
                    <span
                      className="text-neutral-400 text-xs select-none transition-transform duration-150"
                      style={{
                        display: 'inline-block',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▶
                    </span>
                  )}
                  <span className="font-semibold text-neutral-900 flex-1">{producto.nombre}</span>
                  {producto.ref && (
                    <span className="text-xs text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded">
                      {producto.ref}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-neutral-500">
                    {producto.asignaciones.length}{' '}
                    {producto.asignaciones.length !== 1 ? 'ubicaciones' : 'ubicación'}
                  </span>
                </button>
                {isExpanded && (
                  <ul className="border-t border-neutral-200 divide-y divide-neutral-100">
                    {producto.asignaciones.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 group"
                      >
                        <span className="text-neutral-400 text-sm">📍</span>
                        <span className="flex-1 text-sm text-neutral-800">{locationLabel(a)}</span>
                        {a.notas && (
                          <span className="text-xs text-neutral-500 italic">{a.notas}</span>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setEditingAsignacion(a)}
                            className="px-2 py-1 text-xs border border-neutral-200 rounded hover:bg-neutral-100 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(a.id)}
                            className="px-2 py-1 text-xs border border-danger/30 text-danger rounded hover:bg-danger/5 transition-colors"
                          >
                            Quitar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── POR LUGAR ── shows both asignaciones and artículos per lugar */}
      {byLugar.length > 0 && viewMode === 'lugar' && (
        <div className="space-y-4">
          {byLugar.map(([lugarId, grupo]) => (
            <div
              key={lugarId}
              id={`lugar-${lugarId}`}
              className={`border rounded transition-all duration-500 ${
                highlightedLugar === lugarId
                  ? 'border-primary/50 ring-2 ring-primary/20'
                  : 'border-neutral-200'
              }`}
            >
              <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2">
                <span className="font-semibold text-neutral-900">📍 {grupo.nombre}</span>
                <span className="ml-auto text-xs text-neutral-500">
                  {grupo.items.length} {grupo.items.length !== 1 ? 'elementos' : 'elemento'}
                </span>
              </div>
              <ul className="divide-y divide-neutral-100">
                {[...grupo.items]
                  .sort((a, b) => {
                    const na =
                      a.itemKind === 'articulo'
                        ? `${a.producto_nombre} ${a.nombre}`
                        : a.producto_nombre;
                    const nb =
                      b.itemKind === 'articulo'
                        ? `${b.producto_nombre} ${b.nombre}`
                        : b.producto_nombre;
                    return na.localeCompare(nb, 'es-ES', { sensitivity: 'base' });
                  })
                  .map((item) => (
                    <li
                      key={`${item.itemKind}_${item.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50 group"
                    >
                      {item.itemKind === 'articulo' ? (
                        <span className="flex-1 text-sm text-neutral-800 min-w-0 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-neutral-900">
                            {item.producto_nombre}
                          </span>
                          <span className="text-neutral-400">›</span>
                          <span className="text-neutral-700">{item.nombre}</span>
                          {item.compartimento_nombre && (
                            <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded shrink-0">
                              {item.compartimento_nombre}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex-1 text-sm flex items-center gap-1.5">
                          <span className="font-semibold text-neutral-900">
                            {item.producto_nombre}
                          </span>
                          {item.compartimento_nombre && (
                            <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded shrink-0">
                              {item.compartimento_nombre}
                            </span>
                          )}
                        </span>
                      )}
                      {item.itemKind !== 'articulo' && item.producto_ref && (
                        <span className="text-xs text-neutral-500">{item.producto_ref}</span>
                      )}
                      {item.itemKind === 'articulo' && item.ref && (
                        <span className="text-xs text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                          {item.ref}
                        </span>
                      )}
                      {item.notas && (
                        <span className="text-xs text-neutral-500 italic">{item.notas}</span>
                      )}
                      {item.itemKind === 'asignacion' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingAsignacion(item)}
                            className="px-2 py-1 text-xs border border-neutral-200 rounded hover:bg-neutral-100 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(item.id)}
                            className="px-2 py-1 text-xs border border-danger/30 text-danger rounded hover:bg-danger/5 transition-colors"
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                      {item.itemKind === 'articulo' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingArticulo(item)}
                            className="px-2 py-1 text-xs border border-neutral-200 rounded hover:bg-neutral-100 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteArticulo(item.id)}
                            className="px-2 py-1 text-xs border border-danger/30 text-danger rounded hover:bg-danger/5 transition-colors"
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {editingAsignacion && (
        <EditAsignacionModal
          asignacion={editingAsignacion}
          lugares={state.lugares}
          onClose={() => setEditingAsignacion(null)}
          onSave={handleUpdateAsignacion}
        />
      )}

      {editingArticulo && (
        <ArticuloModal
          articulo={editingArticulo}
          producto={
            state.productos.find((p) => p.id === editingArticulo.producto_id) || {
              nombre: editingArticulo.producto_nombre || '',
            }
          }
          lugares={state.lugares}
          onClose={() => setEditingArticulo(null)}
          onSave={handleUpdateArticulo}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Quitar esta asignación?"
          message="El producto no perderá su ficha, solo se eliminará esta ubicación."
          onConfirm={handleDeleteAsignacion}
          onCancel={() => setConfirmDelete(null)}
          confirmText="Quitar"
          confirmDanger
        />
      )}

      {confirmDeleteArticulo && (
        <ConfirmDialog
          title="Eliminar este artículo?"
          message="Se eliminará el artículo permanentemente."
          onConfirm={handleDeleteArticulo}
          onCancel={() => setConfirmDeleteArticulo(null)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Lugares
// ─────────────────────────────────────────────────────────────────────────────

function TabLugares({ state, dispatch, api }) {
  const [selectedId, setSelectedId] = useState(null);
  const [editingLugar, setEditingLugar] = useState(false);
  const [editingCompartimento, setEditingCompartimento] = useState(null);
  const [confirmDeleteLugar, setConfirmDeleteLugar] = useState(null);
  const [confirmDeleteComp, setConfirmDeleteComp] = useState(null);
  const [lugarSearch, setLugarSearch] = useState('');

  const selectedLugar = useMemo(
    () => state.lugares.find((l) => l.id === selectedId) || null,
    [state.lugares, selectedId]
  );

  const filteredLugares = useMemo(() => {
    const q = lugarSearch.trim().toLowerCase();
    if (!q) return state.lugares;
    return state.lugares.filter(
      (l) =>
        l.nombre.toLowerCase().includes(q) ||
        (l.descripcion && l.descripcion.toLowerCase().includes(q))
    );
  }, [state.lugares, lugarSearch]);

  const assignCountByLugar = useMemo(() => {
    const counts = {};
    for (const p of state.productos) {
      for (const a of p.asignaciones) {
        counts[a.lugar_id] = (counts[a.lugar_id] || 0) + 1;
      }
      for (const art of p.articulos || []) {
        if (art.lugar_id) counts[art.lugar_id] = (counts[art.lugar_id] || 0) + 1;
      }
    }
    return counts;
  }, [state.productos]);

  const handleCreateLugar = async (values) => {
    const res = await api.createLugar({ nombre: values.nombre, descripcion: values.descripcion });
    if (res.success) {
      dispatch({ type: 'ADD_LUGAR', value: res.data });
      setSelectedId(res.data.id);
    }
    setEditingLugar(false);
  };

  const handleUpdateLugar = async (values) => {
    const res = await api.updateLugar(selectedId, {
      nombre: values.nombre,
      descripcion: values.descripcion,
    });
    if (res.success) dispatch({ type: 'UPDATE_LUGAR', value: res.data });
    setEditingLugar(false);
  };

  const handleDeleteLugar = async () => {
    if (!confirmDeleteLugar) return;
    const res = await api.deleteLugar(confirmDeleteLugar);
    if (res.success) {
      dispatch({ type: 'DELETE_LUGAR', id: confirmDeleteLugar });
      if (selectedId === confirmDeleteLugar) setSelectedId(null);
    }
    setConfirmDeleteLugar(null);
  };

  const handleCreateCompartimento = async (values) => {
    const res = await api.createCompartimento({
      lugar_id: selectedId,
      nombre: values.nombre,
      descripcion: values.descripcion,
    });
    if (res.success) dispatch({ type: 'ADD_COMPARTIMENTO', value: res.data });
    setEditingCompartimento(null);
  };

  const handleUpdateCompartimento = async (id, values) => {
    const res = await api.updateCompartimento(id, {
      nombre: values.nombre,
      descripcion: values.descripcion,
    });
    if (res.success) dispatch({ type: 'UPDATE_COMPARTIMENTO', value: res.data });
    setEditingCompartimento(null);
  };

  const handleDeleteCompartimento = async () => {
    if (!confirmDeleteComp) return;
    const res = await api.deleteCompartimento(confirmDeleteComp);
    if (res.success) dispatch({ type: 'DELETE_COMPARTIMENTO', id: confirmDeleteComp });
    setConfirmDeleteComp(null);
  };

  const lugarFields = [
    {
      key: 'nombre',
      label: 'Nombre *',
      placeholder: 'Ej: Estantería derecha mesa',
      required: true,
    },
    { key: 'descripcion', label: 'Descripción', placeholder: 'Opcional...', type: 'textarea' },
  ];

  const compartimentoFields = [
    {
      key: 'nombre',
      label: 'Nombre *',
      placeholder: 'Ej: Cajon 1, Estante arriba, 6...',
      required: true,
    },
    { key: 'descripcion', label: 'Descripción', placeholder: 'Opcional...', type: 'textarea' },
  ];

  return (
    <div className="flex gap-6">
      {/* Left: list */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <input
            type="search"
            placeholder="Buscar lugar..."
            value={lugarSearch}
            onChange={(e) => setLugarSearch(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => {
              setEditingLugar('new');
              setSelectedId(null);
            }}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            + Nuevo
          </button>
        </div>

        {editingLugar === 'new' && (
          <div className="xp-surface p-3">
            <p className="text-xs font-medium text-primary mb-2">Nuevo lugar</p>
            <InlineForm
              fields={lugarFields}
              onSubmit={handleCreateLugar}
              onCancel={() => setEditingLugar(false)}
              submitLabel="Crear"
            />
          </div>
        )}

        {filteredLugares.length === 0 && editingLugar !== 'new' && (
          <div className="text-sm text-neutral-500 text-center py-8">
            {state.lugares.length === 0 ? 'No hay lugares todavía.' : 'Sin resultados.'}
          </div>
        )}

        <ul className="space-y-1">
          {filteredLugares.map((lugar) => {
            const count = assignCountByLugar[lugar.id] || 0;
            return (
              <li key={lugar.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(lugar.id);
                    setEditingLugar(false);
                    setEditingCompartimento(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedId === lugar.id
                      ? 'bg-primary text-white'
                      : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-medium truncate">📍 {lugar.nombre}</span>
                    {count > 0 && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          selectedId === lugar.id
                            ? 'bg-white/20 text-white'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                  {lugar.compartimentos?.length > 0 && (
                    <span
                      className={`text-xs mt-0.5 block truncate ${
                        selectedId === lugar.id ? 'text-white/70' : 'text-neutral-500'
                      }`}
                    >
                      {lugar.compartimentos.length}{' '}
                      {lugar.compartimentos.length !== 1 ? 'compartimentos' : 'compartimento'}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right: detail */}
      <div className="flex-1 min-w-0">
        {!selectedLugar && editingLugar !== 'new' && (
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-neutral-200 rounded text-neutral-500 text-sm">
            Selecciona un lugar de la lista para ver su detalle.
          </div>
        )}

        {selectedLugar && (
          <div className="space-y-6">
            {editingLugar === selectedId ? (
              <InlineForm
                fields={lugarFields}
                initialValues={{
                  nombre: selectedLugar.nombre,
                  descripcion: selectedLugar.descripcion || '',
                }}
                onSubmit={handleUpdateLugar}
                onCancel={() => setEditingLugar(false)}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">
                    📍 {selectedLugar.nombre}
                  </h2>
                  {selectedLugar.descripcion && (
                    <p className="text-sm text-neutral-600 mt-1">{selectedLugar.descripcion}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingLugar(selectedId)}
                    className="px-3 py-1.5 text-sm border border-neutral-200 rounded hover:bg-neutral-100 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteLugar(selectedId)}
                    className="px-3 py-1.5 text-sm border border-danger/30 text-danger rounded hover:bg-danger/5 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            {/* Content stored – grouped by compartimento */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">
                  Contenido almacenado
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCompartimento('new')}
                  className="px-2.5 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded transition-colors"
                >
                  + Compartimento
                </button>
              </div>

              {editingCompartimento === 'new' && (
                <div className="mb-3 xp-surface p-3">
                  <InlineForm
                    fields={compartimentoFields}
                    onSubmit={handleCreateCompartimento}
                    onCancel={() => setEditingCompartimento(null)}
                    submitLabel="Añadir"
                  />
                </div>
              )}
              {(() => {
                // Collect all items for this lugar
                const allItems = [];
                for (const p of state.productos) {
                  for (const a of p.asignaciones) {
                    if (a.lugar_id === selectedLugar.id) {
                      allItems.push({
                        itemKind: 'asignacion',
                        ...a,
                        producto_nombre: p.nombre,
                        producto_ref: p.ref,
                      });
                    }
                  }
                  for (const art of p.articulos || []) {
                    if (art.lugar_id === selectedLugar.id) {
                      allItems.push({
                        itemKind: 'articulo',
                        ...art,
                        producto_nombre: p.nombre,
                        producto_ref: p.ref,
                      });
                    }
                  }
                }

                // Group by compartimento, preserving the order from selectedLugar.compartimentos
                const sortName = (item) =>
                  item.itemKind === 'articulo'
                    ? `${item.producto_nombre} ${item.nombre}`
                    : item.producto_nombre;
                const sortItems = (arr) =>
                  [...arr].sort((a, b) =>
                    sortName(a).localeCompare(sortName(b), 'es-ES', { sensitivity: 'base' })
                  );

                // Build ordered compartimento sections from the lugar's own compartimentos list
                const compOrder = (selectedLugar.compartimentos || []).map((c) => ({
                  id: c.id,
                  nombre: c.nombre,
                  descripcion: c.descripcion,
                  compObj: c,
                  items: [],
                }));
                const unassigned = {
                  id: null,
                  nombre: null,
                  descripcion: null,
                  compObj: null,
                  items: [],
                };

                for (const item of allItems) {
                  const section = compOrder.find((c) => c.id === item.compartimento_id);
                  if (section) section.items.push(item);
                  else unassigned.items.push(item);
                }

                // Render ALL compartments (even empty), plus unassigned items
                const sections = [
                  ...compOrder,
                  ...(unassigned.items.length > 0 ? [unassigned] : []),
                ];

                if (sections.length === 0) {
                  return (
                    <p className="text-sm text-neutral-500 italic">
                      Ningún elemento almacenado en este lugar.
                    </p>
                  );
                }

                return (
                  <div className="space-y-4">
                    {sections.map((section) => (
                      <div key={section.id ?? '__none__'}>
                        {section.nombre ? (
                          <div className="flex items-center gap-2 mb-1.5 group">
                            <span className="text-xs font-mono font-semibold bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded">
                              {section.nombre}
                            </span>
                            {section.descripcion && (
                              <span className="text-xs text-neutral-500 italic">
                                {section.descripcion}
                              </span>
                            )}
                            <span className="flex-1 h-px bg-neutral-100" />
                            {section.compObj && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setEditingCompartimento(section.id)}
                                  className="px-2 py-0.5 text-xs border border-neutral-200 rounded hover:bg-neutral-100"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteComp(section.id)}
                                  className="px-2 py-0.5 text-xs border border-danger/30 text-danger rounded hover:bg-danger/5"
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs text-neutral-400 italic">
                              Sin compartimento
                            </span>
                            <span className="flex-1 h-px bg-neutral-100" />
                          </div>
                        )}

                        {/* Edit inline form for this compartimento */}
                        {editingCompartimento === section.id && section.compObj && (
                          <div className="mb-3 xp-surface p-3">
                            <InlineForm
                              fields={compartimentoFields}
                              initialValues={{
                                nombre: section.nombre,
                                descripcion: section.descripcion || '',
                              }}
                              onSubmit={(values) => handleUpdateCompartimento(section.id, values)}
                              onCancel={() => setEditingCompartimento(null)}
                            />
                          </div>
                        )}

                        {/* Items or empty state */}
                        {section.items.length > 0 && (
                          <ul className="space-y-1 pl-2">
                            {sortItems(section.items).map((item) => (
                              <li
                                key={`${item.itemKind}_${item.id}`}
                                className="flex items-center gap-2 text-sm px-3 py-1.5 bg-neutral-50 rounded border border-neutral-100"
                              >
                                {item.itemKind === 'articulo' ? (
                                  <span className="flex-1 min-w-0 text-neutral-800">
                                    <span className="font-semibold text-neutral-900">
                                      {item.producto_nombre}
                                    </span>
                                    <span className="text-neutral-400 mx-1">›</span>
                                    <span>{item.nombre}</span>
                                  </span>
                                ) : (
                                  <span className="font-semibold text-neutral-900 flex-1">
                                    {item.producto_nombre}
                                  </span>
                                )}
                                {item.itemKind === 'asignacion' && item.producto_ref && (
                                  <span className="text-xs text-neutral-500">
                                    {item.producto_ref}
                                  </span>
                                )}
                                {item.itemKind === 'articulo' && item.ref && (
                                  <span className="text-xs text-neutral-500 bg-neutral-200 px-1 rounded">
                                    {item.ref}
                                  </span>
                                )}
                                {item.notas && (
                                  <span className="text-xs text-neutral-400 italic">
                                    - {item.notas}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {confirmDeleteLugar && (
        <ConfirmDialog
          title="Eliminar este lugar?"
          message="Se eliminarán también sus compartimentos y todas las asignaciones de productos."
          onConfirm={handleDeleteLugar}
          onCancel={() => setConfirmDeleteLugar(null)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}

      {confirmDeleteComp && (
        <ConfirmDialog
          title="Eliminar este compartimento?"
          message="Las asignaciones que apuntaban a él pasarán a indicar solo el lugar general."
          onConfirm={handleDeleteCompartimento}
          onCancel={() => setConfirmDeleteComp(null)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Productos
// ─────────────────────────────────────────────────────────────────────────────

function TabProductos({ state, dispatch, api, onAsignar }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [articuloModal, setArticuloModal] = useState(null); // { productoId, articulo? }
  const [confirmDeleteArticulo, setConfirmDeleteArticulo] = useState(null);
  const [expandedProductos, setExpandedProductos] = useState(new Set());
  const [highlightedProductoId, setHighlightedProductoId] = useState(null);

  const productoFields = [
    {
      key: 'nombre',
      label: 'Nombre *',
      placeholder: 'Ej: Bies, Elástico, Tela de lino...',
      required: true,
    },
    { key: 'ref', label: 'Referencia', placeholder: 'Codigo o ref interna...' },
    { key: 'descripcion', label: 'Descripción', placeholder: 'Opcional...', type: 'textarea' },
  ];

  const q = searchQuery.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return state.productos;
    return state.productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.ref && p.ref.toLowerCase().includes(q)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
        (p.articulos || []).some(
          (a) => a.nombre.toLowerCase().includes(q) || (a.ref && a.ref.toLowerCase().includes(q))
        )
    );
  }, [state.productos, q]);

  const sortedShortcuts = useMemo(() => {
    const sorted = [...filtered].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es-ES', { sensitivity: 'base' })
    );
    return sorted.map((p) => {
      const articulos = p.articulos || [];
      const totalEntries = articulos.length + p.asignaciones.length;
      return { ...p, totalEntries };
    });
  }, [filtered]);

  const toggleProducto = useCallback((id) => {
    setExpandedProductos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const navigateToProducto = useCallback((productoId) => {
    setHighlightedProductoId(productoId);
    setExpandedProductos((prev) => {
      const next = new Set(prev);
      next.add(productoId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!highlightedProductoId) return undefined;
    const el = document.getElementById(`producto-${highlightedProductoId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const timer = setTimeout(() => setHighlightedProductoId(null), 1500);
    return () => clearTimeout(timer);
  }, [highlightedProductoId]);

  const handleCreate = async (values) => {
    const res = await api.createProducto({
      nombre: values.nombre,
      ref: values.ref,
      descripcion: values.descripcion,
    });
    if (res.success) dispatch({ type: 'ADD_PRODUCTO', value: res.data });
    setEditingId(null);
  };

  const handleUpdate = async (id, values) => {
    const res = await api.updateProducto(id, {
      nombre: values.nombre,
      ref: values.ref,
      descripcion: values.descripcion,
    });
    if (res.success) dispatch({ type: 'UPDATE_PRODUCTO', value: res.data });
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const res = await api.deleteProducto(confirmDelete);
    if (res.success) dispatch({ type: 'DELETE_PRODUCTO', id: confirmDelete });
    setConfirmDelete(null);
  };

  const handleCreateArticulo = async (data) => {
    if (!articuloModal) return;
    const res = await api.createArticulo({ ...data, producto_id: articuloModal.productoId });
    if (res.success) dispatch({ type: 'ADD_ARTICULO', value: res.data });
  };

  const handleUpdateArticulo = async (data) => {
    if (!articuloModal?.articulo) return;
    const res = await api.updateArticulo(articuloModal.articulo.id, data);
    if (res.success) dispatch({ type: 'UPDATE_ARTICULO', value: res.data });
  };

  const handleDeleteArticulo = async () => {
    if (!confirmDeleteArticulo) return;
    const res = await api.deleteArticulo(confirmDeleteArticulo);
    if (res.success) dispatch({ type: 'DELETE_ARTICULO', id: confirmDeleteArticulo });
    setConfirmDeleteArticulo(null);
  };

  const articuloModalProducto = articuloModal
    ? state.productos.find((p) => p.id === articuloModal.productoId)
    : null;

  return (
    <div>
      <div className="flex gap-3 mb-5 items-center">
        <input
          type="search"
          placeholder="Buscar producto o artículo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setEditingId('new')}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          + Nuevo producto
        </button>
      </div>

      {editingId === 'new' && (
        <div className="mb-5 border border-primary/30 rounded p-4 bg-primary/5 max-w-lg">
          <p className="text-sm font-semibold text-primary mb-3">Nuevo producto</p>
          <InlineForm
            fields={productoFields}
            onSubmit={handleCreate}
            onCancel={() => setEditingId(null)}
            submitLabel="Crear"
          />
        </div>
      )}

      {filtered.length === 0 && editingId !== 'new' && (
        <div className="text-center py-16 text-neutral-500">
          <div className="text-5xl mb-3">📦</div>
          <p>
            {state.productos.length === 0
              ? 'No hay productos todavía.'
              : `Sin resultados para "${searchQuery}"`}
          </p>
        </div>
      )}

      {sortedShortcuts.length > 0 && (
        <div className="mb-4 pb-4 border-b border-neutral-200 flex gap-2 flex-wrap">
          {sortedShortcuts.map((producto) => (
            <button
              key={producto.id}
              type="button"
              onClick={() => navigateToProducto(producto.id)}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-100 border border-neutral-200 rounded hover:bg-neutral-200 hover:border-primary transition-colors text-neutral-700 hover:text-primary whitespace-nowrap"
            >
              {producto.nombre}
              {producto.totalEntries > 0 && (
                <span className="ml-1 text-neutral-500">({producto.totalEntries})</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((producto) => {
          const isEditing = editingId === producto.id;
          const articulos = producto.articulos || [];
          const isExpanded = expandedProductos.has(producto.id);
          const totalEntries = articulos.length + producto.asignaciones.length;

          return (
            <div
              key={producto.id}
              id={`producto-${producto.id}`}
              className={`border rounded overflow-hidden transition-all duration-300 ${
                highlightedProductoId === producto.id
                  ? 'border-primary/50 ring-2 ring-primary/20'
                  : 'border-neutral-200'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleProducto(producto.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleProducto(producto.id);
                  }
                }}
                className="w-full px-4 py-2.5 bg-neutral-50 flex items-center gap-2 hover:bg-neutral-100 transition-colors text-left cursor-pointer"
              >
                <span
                  className="text-neutral-400 text-xs select-none transition-transform duration-150"
                  style={{
                    display: 'inline-block',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                >
                  ▶
                </span>
                <span className="font-semibold text-neutral-900 flex-1">{producto.nombre}</span>
                {producto.ref && (
                  <span className="text-xs text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded">
                    {producto.ref}
                  </span>
                )}
                {totalEntries > 0 && (
                  <span className="text-xs text-neutral-500">({totalEntries})</span>
                )}
                {!isEditing && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingId(producto.id);
                      }}
                      className="px-2 py-1 text-xs border border-neutral-200 rounded hover:bg-neutral-200 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmDelete(producto.id);
                      }}
                      className="px-2 py-1 text-xs border border-danger/30 text-danger rounded hover:bg-danger/5 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-neutral-200 bg-white">
                  {isEditing ? (
                    <div className="p-4">
                      <InlineForm
                        fields={productoFields}
                        initialValues={{
                          nombre: producto.nombre,
                          ref: producto.ref || '',
                          descripcion: producto.descripcion || '',
                        }}
                        onSubmit={(values) => handleUpdate(producto.id, values)}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {producto.descripcion && (
                        <p className="text-xs text-neutral-600 whitespace-pre-wrap">
                          {producto.descripcion}
                        </p>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
                            Artículos
                            {articulos.length > 0 && (
                              <span className="font-normal normal-case bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full text-xs">
                                {articulos.length}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setArticuloModal({ productoId: producto.id })}
                            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            + Añadir
                          </button>
                        </div>

                        {articulos.length === 0 ? (
                          <p className="text-xs text-neutral-400 italic">Sin artículos todavía.</p>
                        ) : (
                          <ul className="space-y-1">
                            {articulos.map((art) => (
                              <li
                                key={art.id}
                                className="group flex items-start gap-2 text-xs rounded px-2 py-1.5 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-neutral-800">
                                      {art.nombre}
                                    </span>
                                    {art.ref && (
                                      <span className="text-neutral-500 bg-neutral-200 px-1 py-0.5 rounded text-xs">
                                        {art.ref}
                                      </span>
                                    )}
                                  </div>
                                  {art.lugar_id ? (
                                    <div className="flex items-center gap-1 mt-0.5 text-neutral-500">
                                      <span>📍</span>
                                      <span className="truncate">
                                        {art.compartimento_nombre
                                          ? `${art.lugar_nombre} – ${art.compartimento_nombre}`
                                          : art.lugar_nombre}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-neutral-400 italic mt-0.5">
                                      Sin ubicación
                                    </div>
                                  )}
                                  {art.notas && (
                                    <div className="text-neutral-400 italic mt-0.5">
                                      {art.notas}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setArticuloModal({ productoId: producto.id, articulo: art })
                                    }
                                    className="px-1.5 py-0.5 border border-neutral-200 rounded hover:bg-white transition-colors text-neutral-600"
                                  >
                                    ✏
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteArticulo(art.id)}
                                    className="px-1.5 py-0.5 border border-danger/30 text-danger rounded hover:bg-danger/5 transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {articulos.length === 0 && (
                        <div>
                          {producto.asignaciones.length > 0 ? (
                            <ul className="space-y-1">
                              {producto.asignaciones.map((a) => (
                                <li
                                  key={a.id}
                                  className="flex items-center gap-1.5 text-xs text-neutral-700 bg-neutral-50 rounded px-2 py-1"
                                >
                                  <span className="text-neutral-400">📍</span>
                                  <span>{locationLabel(a)}</span>
                                  {a.notas && (
                                    <span className="text-neutral-400 italic">- {a.notas}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-neutral-400 italic">
                              Sin ubicación asignada.
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => onAsignar(producto.id)}
                            className="mt-2 w-full px-3 py-1.5 text-xs border border-neutral-200 rounded hover:border-primary hover:text-primary transition-colors text-neutral-600"
                          >
                            + Asignar a lugar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {articuloModal && articuloModalProducto && (
        <ArticuloModal
          articulo={articuloModal.articulo || null}
          producto={articuloModalProducto}
          lugares={state.lugares}
          onClose={() => setArticuloModal(null)}
          onSave={articuloModal.articulo ? handleUpdateArticulo : handleCreateArticulo}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar este producto?"
          message="Se eliminarán también todos sus artículos y asignaciones de ubicación."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}

      {confirmDeleteArticulo && (
        <ConfirmDialog
          title="Eliminar este artículo?"
          message="Se eliminará el artículo permanentemente."
          onConfirm={handleDeleteArticulo}
          onCancel={() => setConfirmDeleteArticulo(null)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Guardado page
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'buscar', label: 'Buscar', icon: '🔍' },
  { id: 'lugares', label: 'Lugares', icon: '📍' },
  { id: 'productos', label: 'Productos', icon: '📦' },
];

export default function Guardado() {
  const { state, dispatch, api } = useGuardado();
  const [activeTab, setActiveTab] = useState('buscar');
  const [asignarModal, setAsignarModal] = useState(null);

  const handleAsignarSave = async (data) => {
    const res = await api.createAsignacion(data);
    if (res.success) dispatch({ type: 'ADD_ASIGNACION', value: res.data });
  };

  const totalAlmacenados = state.productos.reduce(
    (acc, p) => acc + p.asignaciones.length + (p.articulos?.length || 0),
    0
  );

  if (state.loading && state.productos.length === 0 && state.lugares.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-40 text-neutral-500">Cargando...</div>
    );
  }

  return (
    <div className="p-6">
      <div className="xp-toolbar justify-between mb-5">
        <h1 className="text-2xl font-bold text-neutral-900 m-0">📍 Guardado</h1>
        <div className="text-sm text-neutral-500 flex gap-4">
          <span>
            {state.lugares.length} {state.lugares.length !== 1 ? 'lugares' : 'lugar'}
          </span>
          <span>
            {state.productos.length} {state.productos.length !== 1 ? 'productos' : 'producto'}
          </span>
          {totalAlmacenados > 0 && (
            <span>
              {totalAlmacenados}{' '}
              {totalAlmacenados !== 1 ? 'elementos almacenados' : 'elemento almacenado'}
            </span>
          )}
        </div>
      </div>

      <div className="flex border-b border-neutral-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary-700'
                : 'border-transparent text-primary/80 hover:text-primary-700 hover:border-neutral-300'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'buscar' && <TabBuscar state={state} dispatch={dispatch} api={api} />}
      {activeTab === 'lugares' && <TabLugares state={state} dispatch={dispatch} api={api} />}
      {activeTab === 'productos' && (
        <TabProductos
          state={state}
          dispatch={dispatch}
          api={api}
          onAsignar={(productoId) => setAsignarModal({ defaultProductoId: productoId })}
        />
      )}

      {asignarModal !== null && (
        <AsignarModal
          lugares={state.lugares}
          productos={state.productos}
          defaultProductoId={asignarModal.defaultProductoId || null}
          onClose={() => setAsignarModal(null)}
          onSave={handleAsignarSave}
        />
      )}
    </div>
  );
}
