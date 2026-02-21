import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import PDFThumbnail from './PDFThumbnail';
import ConfirmDialog from './ConfirmDialog';
import useToast from '../hooks/useToast';

/**
 * PDFUploadSection component
 * Manages PDF uploads and displays thumbnails for an entity (proveedor or cliente)
 *
 * @param {Object} props
 * @param {string} props.tipo - 'compra' or 'venta'
 * @param {number} props.entidadId - ID of the entity (proveedor or cliente)
 * @param {string} props.entidadNombre - Name of the entity
 */
function PDFUploadSection({ tipo, entidadId = null, entidadNombre }) {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { showToast } = useToast();

  const fetchPDFs = useCallback(async () => {
    if (!entidadId) return;

    try {
      setLoading(true);
      const response = await window.electronAPI.facturas.getAllForEntidad({
        tipo,
        entidadId,
      });

      if (response.success) {
        setPdfs(response.data || []);
      } else {
        showToast(response.error?.message || 'Error al cargar PDFs', 'error');
      }
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      showToast('Error al cargar PDFs', 'error');
    } finally {
      setLoading(false);
    }
  }, [tipo, entidadId, showToast]);

  useEffect(() => {
    fetchPDFs();
  }, [fetchPDFs]);

  const handleFileSelect = async (event) => {
    const { target } = event;
    const files = Array.from(target.files || []);
    if (files.length === 0) return;

    const maxSize = 52428800;
    const validFiles = files.filter((file) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast(`"${file.name}" no es un PDF válido`, 'error');
        return false;
      }

      if (file.size > maxSize) {
        showToast(`"${file.name}" supera los 50 MB`, 'error');
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) {
      target.value = '';
      return;
    }

    try {
      setUploading(true);
      const uploadResponses = await Promise.all(
        validFiles.map(async (file) => {
          const response = await window.electronAPI.facturas.uploadPDF({
            tipo,
            entidadId,
            entidadNombre,
            filePath: file.path,
          });

          return { file, response };
        })
      );

      const successCount = uploadResponses.reduce((count, { file, response }) => {
        if (response.success) {
          return count + 1;
        }

        showToast(response.error?.message || `Error al subir "${file.name}"`, 'error');
        return count;
      }, 0);

      if (successCount > 0) {
        showToast(
          successCount === 1
            ? '1 PDF subido correctamente'
            : `${successCount} PDFs subidos correctamente`,
          'success'
        );
        await fetchPDFs();
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      showToast('Error al subir PDF', 'error');
    } finally {
      setUploading(false);
      target.value = '';
    }
  };

  const handleDelete = async (pdf) => {
    try {
      const response = await window.electronAPI.facturas.deletePDF(pdf.id);

      if (response.success) {
        showToast('PDF eliminado correctamente', 'success');
        await fetchPDFs();
        setDeleteConfirm(null);
      } else {
        showToast(response.error?.message || 'Error al eliminar PDF', 'error');
      }
    } catch (error) {
      console.error('Error deleting PDF:', error);
      showToast('Error al eliminar PDF', 'error');
    }
  };

  // Only show section if entity is being edited (has an ID)
  if (!entidadId) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
        <p className="text-sm text-neutral-600 text-center">
          Guarda el {tipo === 'compra' ? 'proveedor' : 'cliente'} primero para poder subir PDFs
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Facturas PDF ({pdfs.length})</h3>
        <label
          htmlFor="pdf-upload"
          className={`px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors cursor-pointer ${
            uploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {uploading ? 'Subiendo...' : '+ Subir PDF'}
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-neutral-500">Cargando PDFs...</p>
        </div>
      )}

      {!loading && pdfs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-neutral-500">No hay PDFs subidos</p>
        </div>
      )}

      {!loading && pdfs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pdfs.map((pdf) => (
            <div key={pdf.id} className="relative group">
              <div className="border border-neutral-200 rounded-lg p-2 hover:border-primary transition-colors">
                <PDFThumbnail pdfPath={pdf.ruta_relativa} />
                <div className="mt-2">
                  <p className="text-xs text-neutral-700 truncate" title={pdf.nombre_original}>
                    {pdf.nombre_original}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(pdf.fecha_subida).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirm(pdf)}
                className="absolute top-1 right-1 bg-danger text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger/90"
                title="Eliminar PDF"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="¿Eliminar este PDF?"
          message="Esta acción no se puede deshacer."
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}
    </div>
  );
}

PDFUploadSection.propTypes = {
  tipo: PropTypes.oneOf(['compra', 'venta']).isRequired,
  entidadId: PropTypes.number,
  entidadNombre: PropTypes.string.isRequired,
};

export default PDFUploadSection;
