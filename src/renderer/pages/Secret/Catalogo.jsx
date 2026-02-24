import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { EmptyState, LoadingState } from '../../components/entries';
import useToast from '../../hooks/useToast';

function getFolderName(folder) {
  return folder?.concepto?.trim() || 'Sin concepto';
}

function CatalogoForm({ folderId = null, isEntry = false }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [producto, setProducto] = useState('');
  const [link, setLink] = useState('');

  const isRootFolderForm = !isEntry && folderId === null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (isEntry) {
        const response = await window.electronAPI.secretCatalogo.createEntry({
          folderId,
          producto,
          link,
        });

        if (!response?.success) {
          throw new Error(response?.error?.message || 'No se pudo crear la entrada');
        }

        showToast('Entrada creada correctamente', 'success');
        navigate(`/mixo/catalogo/${folderId}`);
        return;
      }

      const response = await window.electronAPI.secretCatalogo.createFolder({
        parentId: folderId,
        concepto,
      });

      if (!response?.success) {
        throw new Error(response?.error?.message || 'No se pudo crear la carpeta');
      }

      showToast('Carpeta creada correctamente', 'success');
      navigate(folderId ? `/mixo/catalogo/${folderId}` : '/mixo/catalogo');
    } catch (error) {
      showToast(error.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center">
        <h1 className="text-2xl font-bold text-neutral-900 flex-1">
          {isEntry ? 'Nueva entrada' : 'Nueva carpeta'}
        </h1>
        <button
          type="button"
          onClick={() => navigate(folderId ? `/mixo/catalogo/${folderId}` : '/mixo/catalogo')}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          ← Volver
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded border border-neutral-200 bg-white p-4 space-y-4"
      >
        {isEntry ? (
          <>
            <div>
              <label
                htmlFor="secret-catalogo-producto"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Producto
                <input
                  id="secret-catalogo-producto"
                  type="text"
                  value={producto}
                  onChange={(e) => setProducto(e.target.value)}
                  placeholder="Producto (opcional)"
                  className="mt-1 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </label>
            </div>
            <div>
              <label
                htmlFor="secret-catalogo-link"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Link
                <input
                  id="secret-catalogo-link"
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Link (opcional)"
                  className="mt-1 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </label>
            </div>
          </>
        ) : (
          <div>
            <label
              htmlFor="secret-catalogo-concepto"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Concepto
              <input
                id="secret-catalogo-concepto"
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder={isRootFolderForm ? 'Concepto' : 'Concepto (opcional)'}
                required={isRootFolderForm}
                className="mt-1 w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </label>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CatalogoList({ folderId = null }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [entries, setEntries] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [foldersRes, entriesRes, folderRes] = await Promise.all([
        window.electronAPI.secretCatalogo.getFolders(folderId),
        folderId
          ? window.electronAPI.secretCatalogo.getEntries(folderId)
          : Promise.resolve({ success: true, data: [] }),
        folderId
          ? window.electronAPI.secretCatalogo.getFolderById(folderId)
          : Promise.resolve({ success: true, data: null }),
      ]);

      if (!foldersRes?.success) {
        throw new Error(foldersRes?.error?.message || 'No se pudieron cargar carpetas');
      }

      if (!entriesRes?.success) {
        throw new Error(entriesRes?.error?.message || 'No se pudieron cargar entradas');
      }

      if (!folderRes?.success) {
        throw new Error(folderRes?.error?.message || 'No se pudo cargar carpeta');
      }

      setFolders(foldersRes.data || []);
      setEntries(entriesRes.data || []);
      setCurrentFolder(folderRes.data || null);
    } catch (error) {
      showToast(error.message || 'Error cargando catálogo', 'error');
      setFolders([]);
      setEntries([]);
      setCurrentFolder(null);
    } finally {
      setLoading(false);
    }
  }, [folderId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const title = useMemo(() => {
    if (!folderId) return 'Catálogo';
    return `Catálogo · ${getFolderName(currentFolder)}`;
  }, [currentFolder, folderId]);

  if (loading && folders.length === 0 && entries.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              navigate(folderId ? `/mixo/catalogo/${folderId}/nueva` : '/mixo/catalogo/nueva')
            }
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Nueva carpeta
          </button>
          {folderId && (
            <button
              type="button"
              onClick={() => navigate(`/mixo/catalogo/${folderId}/entrada/nueva`)}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              Nueva entrada
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(folderId ? '/mixo/catalogo' : '/mixo')}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>

      {folders.length > 0 ? (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => navigate(`/mixo/catalogo/${folder.id}`)}
                className="px-3 py-1.5 border border-neutral-200 rounded bg-white hover:border-primary hover:text-primary transition-colors text-sm text-neutral-700"
              >
                {`📁 ${getFolderName(folder)}`}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon="📁" title="carpetas" hasSearchQuery={false} />
      )}

      {folderId && (
        <div className="rounded border border-neutral-200 bg-white overflow-x-auto">
          <div className="px-3 py-2 border-b border-neutral-200 font-semibold text-neutral-900">
            Entradas
          </div>
          <table className="min-w-full text-sm text-left">
            <thead className="bg-neutral-100 text-neutral-700">
              <tr>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td className="px-3 py-2 text-neutral-600" colSpan={2}>
                    No hay entradas en esta carpeta.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Catalogo() {
  const location = useLocation();
  const { folderId } = useParams();
  const parsedFolderId = folderId ? parseInt(folderId, 10) : null;
  const currentFolderId = Number.isInteger(parsedFolderId) ? parsedFolderId : null;

  const isEntryForm = location.pathname.endsWith('/entrada/nueva');
  const isFolderForm = location.pathname.endsWith('/nueva') && !isEntryForm;

  if (isEntryForm && currentFolderId) {
    return <CatalogoForm folderId={currentFolderId} isEntry />;
  }

  if (isFolderForm) {
    return <CatalogoForm folderId={currentFolderId} />;
  }

  return <CatalogoList folderId={currentFolderId} />;
}

export default Catalogo;
