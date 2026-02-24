import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EntriesGrid, EntryCard, EmptyState, LoadingState } from '../../components/entries';
import useCRUD from '../../hooks/useCRUD';
import { formatDateTime } from '../../utils/formatDateTime';
import ProveedorForm from '../Facturas/ProveedorForm';
import Catalogo from './Catalogo';

const defaultArticleForProveedor = (proveedorName) => {
  const baseName = proveedorName?.trim() || 'Proveedor';
  const article = `Nota ${baseName}`;
  return article.length > 255 ? article.slice(0, 255) : article;
};

const OPEN_PROVEEDORES_STORAGE_KEY = 'encargar-open-proveedores';

const getInitialOpenProveedorIds = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(OPEN_PROVEEDORES_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((id) => Number.isInteger(id) && id > 0);
  } catch (_error) {
    return [];
  }
};

function EncargarWorkspaceView({ preselectedEntryId = null }) {
  const navigate = useNavigate();
  const {
    entries: proveedores,
    loading: proveedoresLoading,
    fetchAll: fetchProveedores,
  } = useCRUD('proveedores');
  const {
    entries: encargarEntries,
    loading: encargarLoading,
    fetchAll: fetchEncargar,
    create,
    update,
    delete: deleteEncargar,
  } = useCRUD('encargar');

  const dropdownRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openProveedorIds, setOpenProveedorIds] = useState(getInitialOpenProveedorIds);
  const [editingProveedorId, setEditingProveedorId] = useState(null);
  const [editorValues, setEditorValues] = useState({});
  const [savingProveedorId, setSavingProveedorId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [didApplyPreselection, setDidApplyPreselection] = useState(false);

  useEffect(() => {
    fetchProveedores();
    fetchEncargar();
  }, [fetchEncargar, fetchProveedores]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }

    return undefined;
  }, [isDropdownOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const availableProveedorIds = new Set(proveedores.map((item) => item.id));
    setOpenProveedorIds((previous) => {
      const filtered = previous.filter((id) => availableProveedorIds.has(id));
      if (filtered.length === previous.length) {
        return previous;
      }
      return filtered;
    });
  }, [proveedores]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(OPEN_PROVEEDORES_STORAGE_KEY, JSON.stringify(openProveedorIds));
  }, [openProveedorIds]);

  const latestEntryByProveedor = useMemo(() => {
    return encargarEntries.reduce((acc, entry) => {
      if (!entry.proveedor_id) {
        return acc;
      }

      const current = acc[entry.proveedor_id];
      if (!current) {
        acc[entry.proveedor_id] = entry;
        return acc;
      }

      const currentDate = new Date(current.fecha_mod || current.fecha_creacion || 0).getTime();
      const entryDate = new Date(entry.fecha_mod || entry.fecha_creacion || 0).getTime();
      if (entryDate > currentDate) {
        acc[entry.proveedor_id] = entry;
      }

      return acc;
    }, {});
  }, [encargarEntries]);

  useEffect(() => {
    if (!preselectedEntryId || didApplyPreselection || encargarEntries.length === 0) {
      return;
    }

    const entry = encargarEntries.find((item) => item.id === preselectedEntryId);
    if (entry?.proveedor_id) {
      setOpenProveedorIds((previous) =>
        previous.includes(entry.proveedor_id) ? previous : [...previous, entry.proveedor_id]
      );
      setEditingProveedorId(entry.proveedor_id);
      setEditorValues((previous) => ({
        ...previous,
        [entry.proveedor_id]: entry.descripcion || '',
      }));
    }

    setDidApplyPreselection(true);
  }, [didApplyPreselection, encargarEntries, preselectedEntryId]);

  const isLoading = proveedoresLoading || encargarLoading;

  const sortedProveedores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? proveedores.filter(
          (proveedor) =>
            (proveedor.razon_social && proveedor.razon_social.toLowerCase().includes(query)) ||
            (proveedor.direccion && proveedor.direccion.toLowerCase().includes(query)) ||
            (proveedor.nif && proveedor.nif.toLowerCase().includes(query))
        )
      : proveedores;

    return [...filtered].sort((a, b) => a.razon_social.localeCompare(b.razon_social, 'es-ES'));
  }, [proveedores, searchQuery]);

  const openProveedores = useMemo(
    () => openProveedorIds.map((id) => proveedores.find((item) => item.id === id)).filter(Boolean),
    [openProveedorIds, proveedores]
  );

  const selectProveedor = (proveedorId) => {
    setOpenProveedorIds((previous) =>
      previous.includes(proveedorId) ? previous : [...previous, proveedorId]
    );
    setEditingProveedorId(null);
    setDeleteConfirm(null);
    setIsDropdownOpen(false);
  };

  const handleSearchEnter = (event) => {
    if (event.key !== 'Enter' || sortedProveedores.length === 0) {
      return;
    }

    event.preventDefault();
    selectProveedor(sortedProveedores[0].id);
  };

  const handleOpenEditorForProveedor = (proveedorId) => {
    const entry = latestEntryByProveedor[proveedorId] || null;

    setEditorValues((previous) => ({
      ...previous,
      [proveedorId]: entry?.descripcion || previous[proveedorId] || '',
    }));
    setEditingProveedorId(proveedorId);
  };

  const handleSave = async (proveedor) => {
    if (!proveedor?.id) {
      return;
    }

    const proveedorId = proveedor.id;
    const selectedEntry = latestEntryByProveedor[proveedorId] || null;
    const editorText = editorValues[proveedorId] || '';

    setSavingProveedorId(proveedorId);

    try {
      if (selectedEntry) {
        const result = await update(selectedEntry.id, { descripcion: editorText });
        if (result) {
          setEditingProveedorId(null);
        }
        return;
      }

      const result = await create({
        proveedor_id: proveedorId,
        articulo: defaultArticleForProveedor(proveedor.razon_social),
        descripcion: editorText,
        ref_interna: null,
        ref_proveedor: null,
        urgente: false,
      });

      if (result) {
        setEditingProveedorId(null);
      }
    } finally {
      setSavingProveedorId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      return;
    }

    const success = await deleteEncargar(deleteConfirm.entryId);
    if (success) {
      setDeleteConfirm(null);
      setEditingProveedorId((current) => (current === deleteConfirm.proveedorId ? null : current));
      setEditorValues((previous) => {
        const next = { ...previous };
        delete next[deleteConfirm.proveedorId];
        return next;
      });
      setOpenProveedorIds((previous) =>
        previous.filter((proveedorId) => proveedorId !== deleteConfirm.proveedorId)
      );
    }
  };

  const getEntryDateLabel = (entry) => {
    if (entry?.fecha_mod) {
      return formatDateTime(entry.fecha_mod);
    }

    if (entry?.fecha_creacion) {
      return formatDateTime(entry.fecha_creacion);
    }

    return 'Sin fecha';
  };

  if (isLoading && proveedores.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Encargar</h1>
        <div className="ml-auto flex items-center gap-2" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => navigate('/encargar/catalogo')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            📁 Catálogo
          </button>
          <button
            type="button"
            onClick={() => navigate('/encargar/proveedor/nuevo')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            + Nueva carpeta
          </button>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="px-4 py-2 border border-neutral-200 rounded bg-white hover:border-primary hover:text-primary transition-colors text-neutral-700"
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
          >
            📁 Proveedores
          </button>

          {isDropdownOpen && (
            <div className="absolute top-20 right-6 z-40 w-80 max-h-72 overflow-auto rounded border border-neutral-200 bg-white shadow-lg py-1">
              {sortedProveedores.length === 0 ? (
                <div className="px-3 py-2 text-sm text-neutral-600">
                  No hay carpetas disponibles.
                </div>
              ) : (
                sortedProveedores.map((proveedor) => (
                  <button
                    key={`dropdown-${proveedor.id}`}
                    type="button"
                    onClick={() => selectProveedor(proveedor.id)}
                    className="block w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                    role="menuitem"
                  >
                    {`📁 ${proveedor.razon_social}`}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar proveedor y pulsar Enter..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchEnter}
          data-search-input
          className="w-full px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {searchQuery.trim() && sortedProveedores.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {sortedProveedores.map((proveedor) => (
            <button
              key={`search-${proveedor.id}`}
              type="button"
              onClick={() => selectProveedor(proveedor.id)}
              className="px-3 py-1.5 border border-neutral-200 rounded bg-white hover:border-primary hover:text-primary transition-colors text-sm text-neutral-700"
              aria-label={`Abrir carpeta de ${proveedor.razon_social}`}
            >
              {`📁 ${proveedor.razon_social}`}
            </button>
          ))}
        </div>
      )}

      {proveedores.length === 0 && !isLoading ? (
        <EmptyState icon="📁" title="proveedores" hasSearchQuery={!!searchQuery} />
      ) : (
        <div className="mt-6">
          {!openProveedores.length && (
            <div className="w-full min-h-[240px] rounded border-2 border-dashed border-neutral-200 bg-neutral-100 p-4 text-neutral-700 flex items-center justify-center text-center">
              Selecciona una carpeta desde “📁 Proveedores” o busca una en la barra superior para
              abrir su nota.
            </div>
          )}

          {openProveedores.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {openProveedores.map((proveedor) => {
                const selectedEntry = latestEntryByProveedor[proveedor.id] || null;
                const isEditing = editingProveedorId === proveedor.id;
                const editorText = editorValues[proveedor.id] || '';
                const isSaving = savingProveedorId === proveedor.id;

                return (
                  <div
                    key={`open-note-${proveedor.id}`}
                    className="min-h-[240px] rounded border-2 border-neutral-200 bg-white p-4"
                  >
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => handleOpenEditorForProveedor(proveedor.id)}
                        className="w-full h-full text-left"
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h2 className="text-lg font-semibold text-neutral-900">
                            {`📁 ${proveedor.razon_social}`}
                          </h2>
                          <span className="text-sm text-neutral-500">
                            {getEntryDateLabel(selectedEntry)}
                          </span>
                        </div>

                        <div className="text-neutral-700 whitespace-pre-wrap break-words">
                          {selectedEntry?.descripcion?.trim()
                            ? selectedEntry.descripcion
                            : 'Haz clic para escribir una nota libre para este proveedor.'}
                        </div>
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h2 className="text-lg font-semibold text-neutral-900">
                            {`Nota · ${proveedor.razon_social}`}
                          </h2>
                          {selectedEntry && (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({
                                  proveedorId: proveedor.id,
                                  entryId: selectedEntry.id,
                                })
                              }
                              className="px-3 py-1.5 rounded border border-danger text-danger hover:bg-danger/5 transition-colors"
                            >
                              Eliminar nota
                            </button>
                          )}
                        </div>

                        <textarea
                          value={editorText}
                          onChange={(event) =>
                            setEditorValues((previous) => ({
                              ...previous,
                              [proveedor.id]: event.target.value,
                            }))
                          }
                          placeholder="Escribe aquí la nota del proveedor..."
                          className="w-full min-h-[220px] px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                        />

                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProveedorId(null);
                              setEditorValues((previous) => ({
                                ...previous,
                                [proveedor.id]: selectedEntry?.descripcion || '',
                              }));
                            }}
                            className="px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-100 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSave(proveedor)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
                          >
                            {isSaving ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="¿Eliminar esta nota?"
          message="Esta acción no se puede deshacer."
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(false)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}
    </div>
  );
}

function EncargarProveedorView() {
  const navigate = useNavigate();
  const { proveedorId } = useParams();
  const parsedProveedorId = parseInt(proveedorId, 10);
  const entidadId = Number.isNaN(parsedProveedorId) ? null : parsedProveedorId;
  const { entries, loading, fetchAll, delete: deleteEncargar, toggleUrgente } = useCRUD('encargar');
  const { entries: proveedores, fetchAll: fetchProveedores } = useCRUD('proveedores');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuState, setMenuState] = useState(null);

  useEffect(() => {
    fetchAll();
    fetchProveedores();
  }, [fetchAll, fetchProveedores]);

  useEffect(() => {
    const handleClick = () => setMenuState(null);
    if (menuState) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
    return undefined;
  }, [menuState]);

  const proveedor = useMemo(
    () => (entidadId ? proveedores.find((item) => item.id === entidadId) : null),
    [entidadId, proveedores]
  );

  const filteredEncargar = useMemo(() => {
    const entriesInFolder = entries.filter((entry) => entry.proveedor_id === entidadId);
    if (!searchQuery.trim()) return entriesInFolder;

    const query = searchQuery.toLowerCase();
    return entriesInFolder.filter(
      (encargar) =>
        (encargar.articulo && encargar.articulo.toLowerCase().includes(query)) ||
        (encargar.ref_interna && encargar.ref_interna.toLowerCase().includes(query)) ||
        (encargar.descripcion && encargar.descripcion.toLowerCase().includes(query)) ||
        (encargar.ref_proveedor && encargar.ref_proveedor.toLowerCase().includes(query))
    );
  }, [entries, entidadId, searchQuery]);

  const sortedEncargar = useMemo(() => {
    return [...filteredEncargar].sort((a, b) => {
      const aUrgente = a.urgente ? 1 : 0;
      const bUrgente = b.urgente ? 1 : 0;
      if (bUrgente !== aUrgente) {
        return bUrgente - aUrgente;
      }
      return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
    });
  }, [filteredEncargar]);

  const handleDelete = async (id) => {
    const success = await deleteEncargar(id);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const handleToggleUrgente = async (encargar) => {
    await toggleUrgente(encargar.id, !encargar.urgente);
  };

  if (!entidadId) {
    return null;
  }

  if (loading && entries.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/encargar')}
            className="text-primary hover:text-primary/80 flex items-center gap-1 mb-2"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">
            {proveedor?.razon_social || `Proveedor ${entidadId}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/encargar/proveedor/${entidadId}/editar`)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Editar proveedor
          </button>
          <button
            type="button"
            onClick={() => navigate('/encargar/nueva')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            + Nueva entrada
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar en esta carpeta..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-search-input
          className="w-full px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {sortedEncargar.length === 0 && !loading && (
        <EmptyState icon="📦" title="entradas" hasSearchQuery={!!searchQuery} />
      )}

      {sortedEncargar.length > 0 && (
        <EntriesGrid>
          {sortedEncargar.map((encargar) => (
            <EntryCard
              key={encargar.id}
              urgente={encargar.urgente}
              onClick={() => navigate(`/encargar/${encargar.id}`)}
              onActionClick={(e) => setMenuState({ encargar, x: e.clientX, y: e.clientY })}
            >
              <h3
                className={`text-lg font-semibold mb-2 ${
                  encargar.urgente ? 'text-danger' : 'text-neutral-900'
                }`}
              >
                {encargar.articulo}
              </h3>
              <div className="space-y-1 text-sm text-neutral-700">
                {encargar.ref_interna && (
                  <div>
                    <span className="font-medium">Ref. Interna:</span> {encargar.ref_interna}
                  </div>
                )}
                <div className="text-neutral-500">{formatDateTime(encargar.fecha_creacion)}</div>
              </div>
            </EntryCard>
          ))}
        </EntriesGrid>
      )}

      {menuState && (
        <div
          className="fixed bg-neutral-100 border border-neutral-200 rounded-lg shadow-lg py-1 z-50"
          style={{ top: menuState.y, left: menuState.x }}
        >
          <button
            type="button"
            onClick={() => {
              navigate(`/encargar/${menuState.encargar.id}`);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              handleToggleUrgente(menuState.encargar);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            {menuState.encargar.urgente ? 'Desmarcar urgente' : 'Marcar urgente'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirm(menuState.encargar);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-danger hover:bg-danger/5"
          >
            Eliminar
          </button>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="¿Eliminar esta entrada?"
          message="Esta acción no se puede deshacer."
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}
    </div>
  );
}

function Encargar() {
  const location = useLocation();
  const { id, proveedorId } = useParams();
  const parsedEntryId = id ? parseInt(id, 10) : null;
  const entryId = Number.isInteger(parsedEntryId) ? parsedEntryId : null;
  const isCatalogRoute = location.pathname.startsWith('/encargar/catalogo');
  const isNewProveedorRoute = location.pathname === '/encargar/proveedor/nuevo';
  const isProveedorEditRoute = location.pathname.endsWith('/editar');

  if (isCatalogRoute) {
    return <Catalogo />;
  }

  if (location.pathname.includes('/encargar/proveedor')) {
    if (isNewProveedorRoute || (proveedorId && isProveedorEditRoute)) {
      return <ProveedorForm basePath="/encargar" showPDFSection={false} />;
    }

    if (proveedorId) {
      return <EncargarProveedorView />;
    }
  }

  return <EncargarWorkspaceView preselectedEntryId={entryId} />;
}

export default Encargar;
