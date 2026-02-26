import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCRUD from '../../hooks/useCRUD';
import { formatDateTime } from '../../utils/formatDateTime';

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

  const urgentHeader = (
    <div
      className="mb-6 px-4 py-3 flex items-center justify-between gap-3"
      style={{
        background: 'linear-gradient(to bottom, #fbeaea, #f4c3c5)',
        border: '2px solid #c04040',
        borderTop: '2px solid #e06060',
        borderLeft: '2px solid #e06060',
        boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.5), 2px 2px 4px rgba(0,0,0,0.2)',
        borderRadius: '3px',
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontSize: '22px', lineHeight: 1 }} aria-hidden="true">
          ⚠️
        </span>
        <div>
          <h1
            style={{
              fontFamily: 'Tahoma, sans-serif',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#7a1010',
              letterSpacing: '0.03em',
              textShadow: '0 1px 0 rgba(255,255,255,0.5)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            URGENTE!
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              color: '#a02020',
              fontFamily: 'Tahoma, sans-serif',
            }}
          >
            Revisar primero
          </p>
        </div>
      </div>
      {!loading && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '22px',
            height: '22px',
            padding: '0 6px',
            background: 'linear-gradient(to bottom, #e85050, #aa1c1c)',
            border: '1px solid #800000',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
            borderRadius: '3px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#fff',
            fontFamily: 'Tahoma, sans-serif',
          }}
        >
          {totalUrgent}
        </span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        {urgentHeader}
        <div className="text-sm text-neutral-500 text-center py-8">Cargando...</div>
      </div>
    );
  }

  if (totalUrgent === 0) {
    return (
      <div className="p-6">
        {urgentHeader}
        <div className="flex flex-col items-center py-16 text-neutral-400">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-lg font-medium">No hay entradas urgentes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {urgentHeader}

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
                className="bg-white flex items-start justify-between gap-4 cursor-pointer"
                style={{
                  border: '2px solid #c04040',
                  borderTop: '2px solid #e06060',
                  borderLeft: '2px solid #e06060',
                  boxShadow: '2px 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
                  borderRadius: '3px',
                  padding: '12px 16px',
                }}
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
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        fontFamily: 'Tahoma, sans-serif',
                        background: 'linear-gradient(to bottom, #f8d0d0, #e89090)',
                        border: '1px solid #b04040',
                        borderRadius: '2px',
                        color: '#7a1c1c',
                      }}
                    >
                      {MODULE_LABELS.notas}
                    </span>
                    <span className="text-danger text-sm" title="Urgente" aria-label="Urgente">
                      ⚠️
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
                  <p className="text-xs text-neutral-500">{formatDateTime(entry.fecha_creacion)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUrgent('notas', entry);
                  }}
                  style={{
                    fontFamily: 'Tahoma, sans-serif',
                    fontSize: '12px',
                    padding: '2px 10px',
                    background: 'linear-gradient(to bottom, #fdf7ef, #e8d4b0)',
                    border: '2px outset #c0a882',
                    borderRadius: '2px',
                    color: '#5c2e0e',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
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
                className="bg-white flex items-start justify-between gap-4 cursor-pointer"
                style={{
                  border: '2px solid #c04040',
                  borderTop: '2px solid #e06060',
                  borderLeft: '2px solid #e06060',
                  boxShadow: '2px 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
                  borderRadius: '3px',
                  padding: '12px 16px',
                }}
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
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        fontFamily: 'Tahoma, sans-serif',
                        background: 'linear-gradient(to bottom, #f8d0d0, #e89090)',
                        border: '1px solid #b04040',
                        borderRadius: '2px',
                        color: '#7a1c1c',
                      }}
                    >
                      {MODULE_LABELS.llamar}
                    </span>
                    <span className="text-danger text-sm" title="Urgente" aria-label="Urgente">
                      ⚠️
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
                  <p className="text-xs text-neutral-500">{formatDateTime(entry.fecha_creacion)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUrgent('llamar', entry);
                  }}
                  style={{
                    fontFamily: 'Tahoma, sans-serif',
                    fontSize: '12px',
                    padding: '2px 10px',
                    background: 'linear-gradient(to bottom, #fdf7ef, #e8d4b0)',
                    border: '2px outset #c0a882',
                    borderRadius: '2px',
                    color: '#5c2e0e',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
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
                className="bg-white flex items-start justify-between gap-4 cursor-pointer"
                style={{
                  border: '2px solid #c04040',
                  borderTop: '2px solid #e06060',
                  borderLeft: '2px solid #e06060',
                  boxShadow: '2px 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
                  borderRadius: '3px',
                  padding: '12px 16px',
                }}
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
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        fontFamily: 'Tahoma, sans-serif',
                        background: 'linear-gradient(to bottom, #f8d0d0, #e89090)',
                        border: '1px solid #b04040',
                        borderRadius: '2px',
                        color: '#7a1c1c',
                      }}
                    >
                      {MODULE_LABELS.encargar}
                    </span>
                    <span className="text-danger text-sm" title="Urgente" aria-label="Urgente">
                      ⚠️
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
                  <p className="text-xs text-neutral-500">{formatDateTime(entry.fecha_creacion)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUrgent('encargar', entry);
                  }}
                  style={{
                    fontFamily: 'Tahoma, sans-serif',
                    fontSize: '12px',
                    padding: '2px 10px',
                    background: 'linear-gradient(to bottom, #fdf7ef, #e8d4b0)',
                    border: '2px outset #c0a882',
                    borderRadius: '2px',
                    color: '#5c2e0e',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
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
