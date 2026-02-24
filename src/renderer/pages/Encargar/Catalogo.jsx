import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EmptyState, LoadingState } from '../../components/entries';
import useToast from '../../hooks/useToast';

const FOLDER_TYPES = {
  proveedor: 'Proveedor',
  familia: 'Familia',
};

const DEFAULT_PRODUCT_HELPER_TEXT = 'Asigna este producto a un proveedor y una familia.';
const PRODUCT_HELPER_TEXT_BY_TYPE = {
  familia: 'Asigna este producto a una familia y un proveedor.',
};

function getFolderName(folder) {
  return folder?.concepto?.trim() || 'Sin concepto';
}

function normalizeFolderType(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'proveedor' || normalized === 'familia') {
    return normalized;
  }

  return null;
}

function FolderForm({ folderId = null, mode = 'create', initialType = 'proveedor' }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = mode === 'edit';

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [folderType, setFolderType] = useState(normalizeFolderType(initialType) || 'proveedor');

  const folderLabel = FOLDER_TYPES[folderType] || 'Carpeta';
  const folderLabelLower = folderLabel.toLowerCase();

  useEffect(() => {
    let isMounted = true;
    if (isEdit && folderId) {
      setLoading(true);

      window.electronAPI.encargarCatalogo
        .getFolderById(folderId)
        .then((response) => {
          if (!isMounted) {
            return;
          }

          if (!response?.success) {
            throw new Error(response?.error?.message || `No se pudo cargar el ${folderLabelLower}`);
          }

          setConcepto(response.data?.concepto || '');
          setFolderType(normalizeFolderType(response.data?.tipo) || 'proveedor');
        })
        .catch((error) => {
          if (isMounted) {
            showToast(error.message || `Error cargando ${folderLabelLower}`, 'error');
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [folderId, isEdit, showToast, folderLabelLower]);

  const title = isEdit ? `Editar ${folderLabel}` : `Nueva ${folderLabel}`;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedConcepto = concepto.trim();
    if (!trimmedConcepto) {
      showToast('Concepto es obligatorio', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && folderId) {
        const response = await window.electronAPI.encargarCatalogo.updateFolder(folderId, {
          concepto: trimmedConcepto,
          tipo: folderType,
        });

        if (!response?.success) {
          throw new Error(
            response?.error?.message || `No se pudo actualizar el ${folderLabelLower}`
          );
        }

        showToast(`${folderLabel} actualizado correctamente`, 'success');
        navigate(`/encargar/catalogo/${folderId}`);
        return;
      }

      const response = await window.electronAPI.encargarCatalogo.createFolder({
        parentId: null,
        concepto: trimmedConcepto,
        tipo: folderType,
      });

      if (!response?.success) {
        throw new Error(response?.error?.message || `No se pudo crear el ${folderLabelLower}`);
      }

      showToast(`${folderLabel} creado correctamente`, 'success');
      navigate('/encargar/catalogo');
    } catch (error) {
      showToast(error.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !folderId) {
      return;
    }

    setIsDeleteConfirmOpen(false);

    setDeleting(true);
    try {
      const response = await window.electronAPI.encargarCatalogo.deleteFolder(folderId);
      if (!response?.success) {
        throw new Error(response?.error?.message || `No se pudo eliminar el ${folderLabelLower}`);
      }

      showToast(`${folderLabel} eliminado correctamente`, 'success');
      navigate('/encargar/catalogo');
    } catch (error) {
      showToast(error.message || `Error eliminando ${folderLabelLower}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center">
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">{title}</h1>
        <button
          type="button"
          onClick={() =>
            navigate(folderId ? `/encargar/catalogo/${folderId}` : '/encargar/catalogo')
          }
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          ← Volver
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded border border-neutral-200 bg-white p-4 space-y-4"
      >
        {loading ? <div className="text-sm text-neutral-600">Cargando carpeta...</div> : null}

        {!isEdit && (
          <div>
            <label
              htmlFor="encargar-catalogo-folder-type"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Tipo
              <select
                id="encargar-catalogo-folder-type"
                value={folderType}
                onChange={(event) => setFolderType(event.target.value)}
                className="mt-1 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="proveedor">Proveedor</option>
                <option value="familia">Familia</option>
              </select>
            </label>
          </div>
        )}

        <div>
          <label
            htmlFor="encargar-catalogo-concepto"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Concepto
            <input
              id="encargar-catalogo-concepto"
              type="text"
              value={concepto}
              onChange={(event) => setConcepto(event.target.value)}
              placeholder="Concepto"
              required
              className="mt-1 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={deleting || saving || loading}
                className="px-4 py-2 rounded border border-danger text-danger hover:bg-danger/5 transition-colors disabled:opacity-60"
              >
                {deleting ? `Eliminando ${folderLabelLower}...` : `Eliminar ${folderLabelLower}`}
              </button>
            )}
            <button
              type="submit"
              disabled={saving || loading || deleting}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>

      {isDeleteConfirmOpen && (
        <ConfirmDialog
          title={`¿Eliminar este ${folderLabelLower}?`}
          message="Esta acción no se puede deshacer."
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}
    </div>
  );
}

function ProductForm({ entryId = null, preselectedFolderId = null }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = Number.isInteger(entryId) && entryId > 0;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [proveedores, setProveedores] = useState([]);
  const [familias, setFamilias] = useState([]);

  const [producto, setProducto] = useState('');
  const [link, setLink] = useState('');
  const [proveedorSelection, setProveedorSelection] = useState('');
  const [familiaSelection, setFamiliaSelection] = useState('');
  const [newProveedorName, setNewProveedorName] = useState('');
  const [newFamiliaName, setNewFamiliaName] = useState('');
  const [preselectedFolderType, setPreselectedFolderType] = useState(null);

  const getBackPath = useCallback(() => {
    if (Number.isInteger(preselectedFolderId) && preselectedFolderId > 0) {
      return `/encargar/catalogo/${preselectedFolderId}`;
    }

    return '/encargar/catalogo';
  }, [preselectedFolderId]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadInitialData = async () => {
      try {
        const [proveedoresRes, familiasRes] = await Promise.all([
          window.electronAPI.encargarCatalogo.getFolders({ tipo: 'proveedor' }),
          window.electronAPI.encargarCatalogo.getFolders({ tipo: 'familia' }),
        ]);

        if (!proveedoresRes?.success) {
          throw new Error(proveedoresRes?.error?.message || 'No se pudieron cargar proveedores');
        }

        if (!familiasRes?.success) {
          throw new Error(familiasRes?.error?.message || 'No se pudieron cargar familias');
        }

        if (!isMounted) {
          return;
        }

        setProveedores(proveedoresRes.data || []);
        setFamilias(familiasRes.data || []);

        if (Number.isInteger(preselectedFolderId) && preselectedFolderId > 0) {
          const folderRes =
            await window.electronAPI.encargarCatalogo.getFolderById(preselectedFolderId);
          if (folderRes?.success && folderRes.data) {
            const preselectedType = normalizeFolderType(folderRes.data.tipo) || 'proveedor';
            setPreselectedFolderType(preselectedType);
            if (preselectedType === 'proveedor') {
              setProveedorSelection(String(preselectedFolderId));
            } else {
              setFamiliaSelection(String(preselectedFolderId));
            }
          }
        }

        if (isEdit) {
          const entryRes = await window.electronAPI.encargarCatalogo.getEntryById(entryId);
          if (!entryRes?.success) {
            throw new Error(entryRes?.error?.message || 'No se pudo cargar el producto');
          }

          const entry = entryRes.data;
          if (!isMounted) {
            return;
          }

          setProducto(entry.producto || '');
          setLink(entry.link || '');
          setProveedorSelection(String(entry.proveedor_folder_id || entry.folder_id || ''));
          setFamiliaSelection(String(entry.familia_folder_id || ''));
        }
      } catch (error) {
        if (isMounted) {
          showToast(error.message || 'Error cargando datos', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [entryId, isEdit, preselectedFolderId, showToast]);

  const resolveFolderSelection = async (type, selectionValue, newNameValue) => {
    if (selectionValue && selectionValue !== '__new__') {
      const parsedId = Number(selectionValue);
      if (Number.isInteger(parsedId) && parsedId > 0) {
        return parsedId;
      }
      throw new Error(`Selecciona una ${FOLDER_TYPES[type].toLowerCase()} válida`);
    }

    if (selectionValue === '__new__') {
      const trimmedName = newNameValue.trim();
      if (!trimmedName) {
        throw new Error(`Escribe el nombre de la nueva ${FOLDER_TYPES[type].toLowerCase()}`);
      }

      const response = await window.electronAPI.encargarCatalogo.createFolder({
        parentId: null,
        tipo: type,
        concepto: trimmedName,
      });

      if (!response?.success) {
        throw new Error(
          response?.error?.message || `No se pudo crear la ${FOLDER_TYPES[type].toLowerCase()}`
        );
      }

      return response.data.id;
    }

    throw new Error(`Selecciona una ${FOLDER_TYPES[type].toLowerCase()}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedProducto = producto.trim();
    if (!trimmedProducto) {
      showToast('Producto es obligatorio', 'error');
      return;
    }

    setSaving(true);
    try {
      const proveedorId = await resolveFolderSelection(
        'proveedor',
        proveedorSelection,
        newProveedorName
      );
      const familiaId = await resolveFolderSelection('familia', familiaSelection, newFamiliaName);

      const payload = {
        producto: trimmedProducto,
        link: link.trim(),
        proveedorFolderId: proveedorId,
        familiaFolderId: familiaId,
      };

      if (isEdit) {
        const response = await window.electronAPI.encargarCatalogo.updateEntry(entryId, payload);
        if (!response?.success) {
          throw new Error(response?.error?.message || 'No se pudo actualizar el producto');
        }

        showToast('Producto actualizado correctamente', 'success');
      } else {
        const response = await window.electronAPI.encargarCatalogo.createEntry(payload);
        if (!response?.success) {
          throw new Error(response?.error?.message || 'No se pudo crear el producto');
        }

        showToast('Producto creado correctamente', 'success');
      }

      navigate(getBackPath());
    } catch (error) {
      showToast(error.message || 'Error al guardar producto', 'error');
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Editar producto' : 'Nuevo producto';
  const helperText =
    PRODUCT_HELPER_TEXT_BY_TYPE[preselectedFolderType] || DEFAULT_PRODUCT_HELPER_TEXT;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center">
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">{title}</h1>
        <button
          type="button"
          onClick={() => navigate(getBackPath())}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          ← Volver
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded border border-neutral-200 bg-white p-4 space-y-4"
      >
        {loading ? <div className="text-sm text-neutral-600">Cargando datos...</div> : null}
        {!loading ? <div className="text-sm text-neutral-600">{helperText}</div> : null}

        <div>
          <label
            htmlFor="encargar-catalogo-producto"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Producto
            <input
              id="encargar-catalogo-producto"
              type="text"
              value={producto}
              onChange={(event) => setProducto(event.target.value)}
              placeholder="Producto"
              required
              className="mt-1 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </label>
        </div>

        <div>
          <label
            htmlFor="encargar-catalogo-link"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Link
            <input
              id="encargar-catalogo-link"
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="Link (opcional)"
              className="mt-1 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </label>
        </div>

        <div>
          <label
            htmlFor="encargar-catalogo-proveedor"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Proveedor
            <select
              id="encargar-catalogo-proveedor"
              value={proveedorSelection}
              onChange={(event) => setProveedorSelection(event.target.value)}
              required
              className="mt-1 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Selecciona proveedor...</option>
              {proveedores.map((folder) => (
                <option key={`proveedor-${folder.id}`} value={String(folder.id)}>
                  {getFolderName(folder)}
                </option>
              ))}
              <option value="__new__">+ Crear nuevo proveedor</option>
            </select>
          </label>
          {proveedorSelection === '__new__' && (
            <input
              type="text"
              value={newProveedorName}
              onChange={(event) => setNewProveedorName(event.target.value)}
              placeholder="Nombre del nuevo proveedor"
              className="mt-2 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          )}
        </div>

        <div>
          <label
            htmlFor="encargar-catalogo-familia"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Familia
            <select
              id="encargar-catalogo-familia"
              value={familiaSelection}
              onChange={(event) => setFamiliaSelection(event.target.value)}
              required
              className="mt-1 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Selecciona familia...</option>
              {familias.map((folder) => (
                <option key={`familia-${folder.id}`} value={String(folder.id)}>
                  {getFolderName(folder)}
                </option>
              ))}
              <option value="__new__">+ Crear nueva familia</option>
            </select>
          </label>
          {familiaSelection === '__new__' && (
            <input
              type="text"
              value={newFamiliaName}
              onChange={(event) => setNewFamiliaName(event.target.value)}
              placeholder="Nombre de la nueva familia"
              className="mt-2 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          )}
        </div>

        <div className="flex justify-end">
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={deleting || saving || loading}
                className="px-4 py-2 rounded border border-danger text-danger hover:bg-danger/5 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Eliminando producto...' : 'Eliminar producto'}
              </button>
            )}
            <button
              type="submit"
              disabled={saving || loading || deleting}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>

      {isDeleteConfirmOpen && (
        <ConfirmDialog
          title="¿Eliminar este producto?"
          message="Esta acción no se puede deshacer."
          onConfirm={async () => {
            if (!isEdit || !entryId) {
              return;
            }

            setIsDeleteConfirmOpen(false);
            setDeleting(true);
            try {
              const response = await window.electronAPI.encargarCatalogo.deleteEntry(entryId);
              if (!response?.success) {
                throw new Error(response?.error?.message || 'No se pudo eliminar el producto');
              }

              showToast('Producto eliminado correctamente', 'success');
              navigate(getBackPath());
            } catch (error) {
              showToast(error.message || 'Error eliminando producto', 'error');
            } finally {
              setDeleting(false);
            }
          }}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}
    </div>
  );
}

function CatalogoList({ folderId = null }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [entries, setEntries] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [proveedoresRes, familiasRes, folderRes] = await Promise.all([
        window.electronAPI.encargarCatalogo.getFolders({ tipo: 'proveedor' }),
        window.electronAPI.encargarCatalogo.getFolders({ tipo: 'familia' }),
        folderId
          ? window.electronAPI.encargarCatalogo.getFolderById(folderId)
          : Promise.resolve({ success: true, data: null }),
      ]);

      if (!proveedoresRes?.success) {
        throw new Error(proveedoresRes?.error?.message || 'No se pudieron cargar proveedores');
      }

      if (!familiasRes?.success) {
        throw new Error(familiasRes?.error?.message || 'No se pudieron cargar familias');
      }

      if (!folderRes?.success) {
        throw new Error(folderRes?.error?.message || 'No se pudo cargar carpeta');
      }

      const folder = folderRes.data || null;
      const folderType = normalizeFolderType(folder?.tipo) || 'proveedor';

      const entriesRes = folderId
        ? await window.electronAPI.encargarCatalogo.getEntries(
            folderType === 'familia'
              ? { familiaFolderId: folderId }
              : { proveedorFolderId: folderId }
          )
        : await window.electronAPI.encargarCatalogo.getEntries();

      if (!entriesRes?.success) {
        throw new Error(
          entriesRes?.error?.message ||
            (folderType === 'familia'
              ? 'No se pudieron cargar los productos de esta familia'
              : 'No se pudieron cargar los productos de este proveedor')
        );
      }

      setProveedores(proveedoresRes.data || []);
      setFamilias(familiasRes.data || []);
      setCurrentFolder(folder);
      setEntries(entriesRes.data || []);
    } catch (error) {
      showToast(error.message || 'Error cargando catálogo', 'error');
      setProveedores([]);
      setFamilias([]);
      setCurrentFolder(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [folderId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentFolderType = normalizeFolderType(currentFolder?.tipo) || 'proveedor';

  const title = useMemo(() => {
    if (!folderId) return 'Catálogo';
    return `${FOLDER_TYPES[currentFolderType]} · ${getFolderName(currentFolder)}`;
  }, [currentFolder, currentFolderType, folderId]);

  const foldersById = useMemo(() => {
    const map = new Map();

    proveedores.forEach((folder) => {
      map.set(folder.id, {
        ...folder,
        tipo: 'proveedor',
      });
    });

    familias.forEach((folder) => {
      map.set(folder.id, {
        ...folder,
        tipo: 'familia',
      });
    });

    return map;
  }, [familias, proveedores]);

  let emptyEntriesMessage = 'No hay productos disponibles.';
  if (folderId) {
    if (currentFolderType === 'familia') {
      emptyEntriesMessage = 'No hay productos asignados a esta familia.';
    } else {
      emptyEntriesMessage = 'No hay productos asignados a este proveedor.';
    }
  }

  if (loading && proveedores.length === 0 && familias.length === 0 && entries.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!folderId && (
            <>
              <button
                type="button"
                onClick={() => navigate('/encargar/catalogo/proveedor/nueva')}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                Nuevo proveedor
              </button>
              <button
                type="button"
                onClick={() => navigate('/encargar/catalogo/familia/nueva')}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                Nueva familia
              </button>
              <button
                type="button"
                onClick={() => navigate('/encargar/catalogo/producto/nueva')}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                Nuevo producto
              </button>
            </>
          )}

          {folderId && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/encargar/catalogo/${folderId}/editar`)}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                {`Editar ${FOLDER_TYPES[currentFolderType].toLowerCase()}`}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/encargar/catalogo/${folderId}/producto/nueva`)}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                Nuevo producto
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => navigate(folderId ? '/encargar/catalogo' : '/encargar')}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>

      {!folderId && (
        <>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Proveedores</h2>
            {proveedores.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {proveedores.map((folder) => (
                  <button
                    key={`proveedor-${folder.id}`}
                    type="button"
                    onClick={() => navigate(`/encargar/catalogo/${folder.id}`)}
                    className="px-3 py-1.5 border border-neutral-200 rounded bg-white hover:border-primary hover:text-primary transition-colors text-sm text-neutral-700"
                  >
                    {`📁 ${getFolderName(folder)}`}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon="📁" title="proveedores" hasSearchQuery={false} />
            )}
          </div>

          <div className="mb-5">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Familias</h2>
            {familias.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {familias.map((folder) => (
                  <button
                    key={`familia-${folder.id}`}
                    type="button"
                    onClick={() => navigate(`/encargar/catalogo/${folder.id}`)}
                    className="px-3 py-1.5 border border-neutral-200 rounded bg-white hover:border-primary hover:text-primary transition-colors text-sm text-neutral-700"
                  >
                    {`📁 ${getFolderName(folder)}`}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon="📁" title="familias" hasSearchQuery={false} />
            )}
          </div>
        </>
      )}

      <div className="rounded border border-neutral-200 bg-white overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-neutral-100 text-neutral-700">
            <tr>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 font-medium">Link</th>
              <th className="px-3 py-2 font-medium">Proveedor</th>
              <th className="px-3 py-2 font-medium">Familia</th>
              <th className="px-3 py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-neutral-600" colSpan={5}>
                  {emptyEntriesMessage}
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const proveedor = foldersById.get(entry.proveedor_folder_id || entry.folder_id);
                const familia = foldersById.get(entry.familia_folder_id);

                return (
                  <tr key={entry.id} className="border-t border-neutral-200">
                    <td className="px-3 py-2 text-neutral-900">{entry.producto || '-'}</td>
                    <td className="px-3 py-2 text-neutral-900">
                      {entry.link ? (
                        <a
                          href={entry.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          {entry.link}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-900">{getFolderName(proveedor)}</td>
                    <td className="px-3 py-2 text-neutral-900">{getFolderName(familia)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/encargar/catalogo/producto/${entry.id}/editar`)}
                        className="px-3 py-1.5 border border-neutral-200 rounded hover:bg-neutral-100 transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Catalogo() {
  const location = useLocation();
  const { folderId, folderType, entryId } = useParams();

  const parsedFolderId = folderId ? Number.parseInt(folderId, 10) : null;
  const currentFolderId = Number.isInteger(parsedFolderId) ? parsedFolderId : null;

  const parsedEntryId = entryId ? Number.parseInt(entryId, 10) : null;
  const currentEntryId = Number.isInteger(parsedEntryId) ? parsedEntryId : null;

  const isFolderTypeCreateRoute = /^\/encargar\/catalogo\/(proveedor|familia)\/nueva$/i.test(
    location.pathname
  );
  const isLegacyCreateFolderRoute = location.pathname === '/encargar/catalogo/nueva';

  const isProductCreateRoute =
    location.pathname.endsWith('/producto/nueva') || location.pathname.endsWith('/entrada/nueva');
  const isProductEditRoute = /\/encargar\/catalogo\/producto\/\d+\/editar$/i.test(
    location.pathname
  );
  const isFolderEditRoute =
    location.pathname.endsWith('/editar') && currentFolderId !== null && !isProductEditRoute;

  if (isProductEditRoute && currentEntryId) {
    return <ProductForm entryId={currentEntryId} />;
  }

  if (isProductCreateRoute) {
    return <ProductForm preselectedFolderId={currentFolderId} />;
  }

  if (isFolderEditRoute && currentFolderId) {
    return <FolderForm folderId={currentFolderId} mode="edit" />;
  }

  if (isFolderTypeCreateRoute) {
    const normalizedType = normalizeFolderType(folderType) || 'proveedor';
    return <FolderForm mode="create" initialType={normalizedType} />;
  }

  if (isLegacyCreateFolderRoute) {
    return <FolderForm mode="create" initialType="proveedor" />;
  }

  return <CatalogoList folderId={currentFolderId} />;
}

export default Catalogo;
