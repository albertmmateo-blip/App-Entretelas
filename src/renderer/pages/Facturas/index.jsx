import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProveedoresList from './ProveedoresList';
import ClientesList from './ClientesList';
import useToast from '../../hooks/useToast';

const OFFICE_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
const MAX_UPLOAD_SIZE_BYTES = 52428800;

function getFileExtension(filename) {
  const index = filename.lastIndexOf('.');
  if (index === -1) {
    return '';
  }

  return filename.slice(index).toLowerCase();
}

function getOfficeIcon(filename) {
  const ext = getFileExtension(filename);

  if (ext === '.doc' || ext === '.docx') {
    return '📘';
  }

  if (ext === '.xls' || ext === '.xlsx') {
    return '📗';
  }

  if (ext === '.ppt' || ext === '.pptx') {
    return '📙';
  }

  return '📄';
}

function Contabilidad() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { showToast } = useToast();
  const [officeFiles, setOfficeFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [openingFilePath, setOpeningFilePath] = useState(null);

  const loadOfficeFiles = useCallback(async () => {
    try {
      setLoadingFiles(true);
      const response = await window.electronAPI.facturas.getAllForEntidad({ tipo: 'contabilidad' });

      if (!response.success) {
        showToast(response.error?.message || 'Error al cargar archivos Office', 'error');
        return;
      }

      setOfficeFiles(response.data || []);
    } catch (error) {
      console.error('Error loading Office files:', error);
      showToast('Error al cargar archivos Office', 'error');
    } finally {
      setLoadingFiles(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (pathname === '/contabilidad' || pathname === '/facturas') {
      loadOfficeFiles();
    }
  }, [pathname, loadOfficeFiles]);

  const handleOfficeUpload = async (event) => {
    const { target } = event;
    const files = Array.from(target.files || []);

    if (files.length === 0) {
      return;
    }

    const validFiles = files.filter((file) => {
      const extension = getFileExtension(file.name);

      if (!OFFICE_EXTENSIONS.includes(extension)) {
        showToast(`"${file.name}" no es un archivo Office permitido`, 'error');
        return false;
      }

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        showToast(`"${file.name}" supera los 50 MB`, 'error');
        return false;
      }

      return true;
    });

    if (!validFiles.length) {
      target.value = '';
      return;
    }

    try {
      setUploadingFiles(true);

      const responses = await Promise.all(
        validFiles.map((file) =>
          window.electronAPI.facturas.uploadPDF({
            tipo: 'contabilidad',
            filePath: file.path,
          })
        )
      );

      const successfulUploads = responses.filter((response) => response.success).length;

      responses.forEach((response, index) => {
        if (!response.success) {
          showToast(
            response.error?.message || `Error al subir "${validFiles[index].name}"`,
            'error'
          );
        }
      });

      if (successfulUploads > 0) {
        showToast(
          successfulUploads === 1
            ? '1 archivo subido correctamente'
            : `${successfulUploads} archivos subidos correctamente`,
          'success'
        );
        await loadOfficeFiles();
      }
    } catch (error) {
      console.error('Error uploading Office files:', error);
      showToast('Error al subir archivo Office', 'error');
    } finally {
      setUploadingFiles(false);
      target.value = '';
    }
  };

  const handleOpenOfficeFile = async (relativePath) => {
    try {
      setOpeningFilePath(relativePath);

      if (typeof window.electronAPI?.facturas?.openStoredFile !== 'function') {
        showToast('Reinicia la aplicación para habilitar la apertura de archivos', 'info');
        return;
      }

      const response = await window.electronAPI.facturas.openStoredFile(relativePath);
      if (!response.success) {
        showToast(response.error?.message || 'No se pudo abrir el archivo', 'error');
        return;
      }

      if (response.data?.revealedInFolder) {
        showToast('No se pudo abrir directamente; se mostró en su carpeta', 'info');
      }
    } catch (error) {
      console.error('Error opening Office file:', error);
      const message = String(error?.message || '');

      if (message.includes('No handler registered for')) {
        showToast('Reinicia la aplicación para habilitar la apertura de archivos', 'info');
        return;
      }

      showToast(message || 'No se pudo abrir el archivo', 'error');
    } finally {
      setOpeningFilePath(null);
    }
  };

  const handleDeleteOfficeFile = async (fileId) => {
    try {
      const response = await window.electronAPI.facturas.deletePDF(fileId);

      if (!response.success) {
        showToast(response.error?.message || 'No se pudo eliminar el archivo', 'error');
        return;
      }

      showToast('Archivo eliminado correctamente', 'success');
      await loadOfficeFiles();
    } catch (error) {
      console.error('Error deleting Office file:', error);
      showToast('No se pudo eliminar el archivo', 'error');
    }
  };

  if (pathname.startsWith('/contabilidad/compra') || pathname.startsWith('/facturas/compra')) {
    return <ProveedoresList />;
  }

  if (pathname.startsWith('/contabilidad/venta') || pathname.startsWith('/facturas/venta')) {
    return <ClientesList />;
  }

  if (pathname.startsWith('/contabilidad/arreglos')) {
    return <ProveedoresList tipo="arreglos" />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Contabilidad</h1>
        <label
          htmlFor="office-upload-input"
          className={`px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors cursor-pointer ${
            uploadingFiles ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {uploadingFiles ? 'Subiendo...' : '+ Subir archivo'}
          <input
            id="office-upload-input"
            type="file"
            accept={OFFICE_EXTENSIONS.join(',')}
            multiple
            className="hidden"
            onChange={handleOfficeUpload}
            disabled={uploadingFiles}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl">
        <button
          onClick={() => navigate('/contabilidad/compra')}
          className="flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-neutral-200 hover:border-primary hover:bg-neutral-50 transition-colors"
          type="button"
        >
          <span className="text-6xl mb-4">📁</span>
          <span className="text-lg font-semibold text-neutral-900">Compra</span>
          <span className="text-sm text-neutral-500 mt-1">Proveedores</span>
        </button>

        <button
          onClick={() => navigate('/contabilidad/venta')}
          className="flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-neutral-200 hover:border-primary hover:bg-neutral-50 transition-colors"
          type="button"
        >
          <span className="text-6xl mb-4">📁</span>
          <span className="text-lg font-semibold text-neutral-900">Venta</span>
          <span className="text-sm text-neutral-500 mt-1">Clientes</span>
        </button>

        <button
          onClick={() => navigate('/contabilidad/arreglos')}
          className="flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-neutral-200 hover:border-primary hover:bg-neutral-50 transition-colors"
          type="button"
        >
          <span className="text-6xl mb-4">📁</span>
          <span className="text-lg font-semibold text-neutral-900">Arreglos</span>
          <span className="text-sm text-neutral-500 mt-1">Proveedores</span>
        </button>

        {officeFiles.map((file) => (
          <div
            key={file.id}
            className="relative flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-neutral-200"
          >
            <button
              type="button"
              onClick={() => handleOpenOfficeFile(file.ruta_relativa)}
              onDoubleClick={() => handleOpenOfficeFile(file.ruta_relativa)}
              title="Clic para abrir"
              className={`flex flex-col items-center justify-center w-full ${
                openingFilePath === file.ruta_relativa ? 'opacity-75 cursor-wait' : ''
              }`}
              disabled={openingFilePath === file.ruta_relativa}
            >
              <span className="text-6xl mb-4" aria-hidden="true">
                {getOfficeIcon(file.nombre_original)}
              </span>
              <span
                className="text-base font-semibold text-neutral-900 text-center break-all"
                title={file.nombre_original}
              >
                {file.nombre_original}
              </span>
              <span className="text-sm text-neutral-500 mt-1">
                {new Date(file.fecha_subida).toLocaleDateString('es-ES')}
              </span>
              {openingFilePath === file.ruta_relativa && (
                <span className="text-xs text-primary mt-1">Abriendo...</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDeleteOfficeFile(file.id)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-danger text-white flex items-center justify-center hover:bg-danger/90"
              title="Eliminar archivo"
              aria-label={`Eliminar ${file.nombre_original}`}
            >
              ×
            </button>
          </div>
        ))}

        {!loadingFiles && officeFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 bg-neutral-100 rounded-lg border-2 border-dashed border-neutral-200">
            <span className="text-5xl mb-3">📎</span>
            <span className="text-base font-semibold text-neutral-900 text-center">
              Sin archivos Office
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Contabilidad;
