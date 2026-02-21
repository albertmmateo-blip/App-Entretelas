import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCRUD from '../../hooks/useCRUD';

const MODULE_LABELS = { notas: 'Notas', llamar: 'Llamar', encargar: 'Encargar' };

function Urgente() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupedEntries, setGroupedEntries] = useState({ notas: [], llamar: [], encargar: [] });

  const notasCrud = useCRUD('notas');
  const llamarCrud = useCRUD('llamar');
  const encargarCrud = useCRUD('encargar');

  useEffect(() => {
    let cancelled = false;

    async function fetchUrgentEntries() {
      setLoading(true);
      try {
        const [notasRes, llamarRes, encargarRes] = await Promise.all([
          window.electronAPI.notas.getAll(),
          window.electronAPI.llamar.getAll(),
          window.electronAPI.encargar.getAll(),
        ]);

        if (!cancelled) {
          // Filter only urgent entries and sort by fecha_mod descending
          const urgentNotas = (notasRes?.data ?? [])
            .filter((entry) => entry.urgente === 1)
            .sort((a, b) => new Date(b.fecha_mod) - new Date(a.fecha_mod));

          const urgentLlamar = (llamarRes?.data ?? [])
            .filter((entry) => entry.urgente === 1)
            .sort((a, b) => new Date(b.fecha_mod) - new Date(a.fecha_mod));

          const urgentEncargar = (encargarRes?.data ?? [])
            .filter((entry) => entry.urgente === 1)
            .sort((a, b) => new Date(b.fecha_mod) - new Date(a.fecha_mod));

          setGroupedEntries({
            notas: urgentNotas,
            llamar: urgentLlamar,
            encargar: urgentEncargar,
          });
        }
      } catch (error) {
        console.error('Error fetching urgent entries:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUrgentEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemoveUrgent = async (type, entry) => {
    let crud;
    if (type === 'notas') crud = notasCrud;
    else if (type === 'llamar') crud = llamarCrud;
    else crud = encargarCrud;

    const success = await crud.toggleUrgente(entry.id, false);
    if (success) {
      // Remove entry from the list optimistically
      setGroupedEntries((prev) => ({
        ...prev,
        [type]: prev[type].filter((e) => e.id !== entry.id),
      }));
    }
  };

  const getTitleField = (type, entry) => {
    if (type === 'notas') return entry.nombre || 'Sin nombre';
    if (type === 'llamar') return entry.asunto || 'Sin asunto';
    return entry.articulo || 'Sin artículo';
  };

  const getContactField = (type, entry) => {
    if (type === 'encargar') return entry.proveedor;
    return entry.contacto;
  };

  const totalUrgent =
    groupedEntries.notas.length + groupedEntries.llamar.length + groupedEntries.encargar.length;

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <span>⚠️</span>
          <span>URGENTE!</span>
        </h1>
        <div className="text-sm text-neutral-500 text-center py-8">Cargando...</div>
      </div>
    );
  }

  if (totalUrgent === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <span>⚠️</span>
          <span>URGENTE!</span>
        </h1>
        <div className="flex flex-col items-center py-16 text-neutral-400">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-lg font-medium">No hay entradas urgentes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
        <span>⚠️</span>
        <span>URGENTE!</span>
      </h1>

      {/* Notas group */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-700 mb-3 border-b border-neutral-200 pb-2">
          {MODULE_LABELS.notas} ({groupedEntries.notas.length})
        </h2>
        {groupedEntries.notas.length === 0 ? (
          <p className="text-sm text-neutral-400 italic pl-4">(Sin entradas urgentes)</p>
        ) : (
          <div className="space-y-2">
            {groupedEntries.notas.map((entry) => (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                className="bg-neutral-100 border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer flex items-start justify-between gap-4"
                onClick={() => navigate(`/notas/${entry.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/notas/${entry.id}`);
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-neutral-100 text-neutral-700">
                      {MODULE_LABELS.notas}
                    </span>
                    <span className="text-danger text-sm" title="Urgente">
                      ●
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">
                    {getTitleField('notas', entry)}
                  </h3>
                  {getContactField('notas', entry) && (
                    <p className="text-sm text-neutral-600 mb-1">
                      Contacto: {getContactField('notas', entry)}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    {new Date(entry.fecha_creacion).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUrgent('notas', entry);
                  }}
                  className="px-3 py-1.5 text-sm text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors whitespace-nowrap"
                >
                  Quitar urgencia
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Llamar group */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-700 mb-3 border-b border-neutral-200 pb-2">
          {MODULE_LABELS.llamar} ({groupedEntries.llamar.length})
        </h2>
        {groupedEntries.llamar.length === 0 ? (
          <p className="text-sm text-neutral-400 italic pl-4">(Sin entradas urgentes)</p>
        ) : (
          <div className="space-y-2">
            {groupedEntries.llamar.map((entry) => (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                className="bg-neutral-100 border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer flex items-start justify-between gap-4"
                onClick={() => navigate(`/llamar/${entry.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/llamar/${entry.id}`);
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-neutral-100 text-neutral-700">
                      {MODULE_LABELS.llamar}
                    </span>
                    <span className="text-danger text-sm" title="Urgente">
                      ●
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">
                    {getTitleField('llamar', entry)}
                  </h3>
                  {getContactField('llamar', entry) && (
                    <p className="text-sm text-neutral-600 mb-1">
                      Contacto: {getContactField('llamar', entry)}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    {new Date(entry.fecha_creacion).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUrgent('llamar', entry);
                  }}
                  className="px-3 py-1.5 text-sm text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors whitespace-nowrap"
                >
                  Quitar urgencia
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Encargar group */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-700 mb-3 border-b border-neutral-200 pb-2">
          {MODULE_LABELS.encargar} ({groupedEntries.encargar.length})
        </h2>
        {groupedEntries.encargar.length === 0 ? (
          <p className="text-sm text-neutral-400 italic pl-4">(Sin entradas urgentes)</p>
        ) : (
          <div className="space-y-2">
            {groupedEntries.encargar.map((entry) => (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                className="bg-neutral-100 border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer flex items-start justify-between gap-4"
                onClick={() => navigate(`/encargar/${entry.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/encargar/${entry.id}`);
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-neutral-100 text-neutral-700">
                      {MODULE_LABELS.encargar}
                    </span>
                    <span className="text-danger text-sm" title="Urgente">
                      ●
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">
                    {getTitleField('encargar', entry)}
                  </h3>
                  {getContactField('encargar', entry) && (
                    <p className="text-sm text-neutral-600 mb-1">
                      Proveedor: {getContactField('encargar', entry)}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    {new Date(entry.fecha_creacion).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUrgent('encargar', entry);
                  }}
                  className="px-3 py-1.5 text-sm text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors whitespace-nowrap"
                >
                  Quitar urgencia
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Urgente;
