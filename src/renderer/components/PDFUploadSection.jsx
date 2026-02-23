import React, { useEffect, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import PDFThumbnail from './PDFThumbnail';
import ConfirmDialog from './ConfirmDialog';
import useToast from '../hooks/useToast';
import { formatEuroAmount, parseEuroAmount } from '../utils/euroAmount';

const MAX_UPLOAD_SIZE_BYTES = 52428800;
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.csv',
  '.txt',
  '.rtf',
  '.odt',
  '.ods',
  '.odp',
];
const OFFICE_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
const QUARTERS = [
  { key: 'T1', monthIndexes: [0, 1, 2] },
  { key: 'T2', monthIndexes: [3, 4, 5] },
  { key: 'T3', monthIndexes: [6, 7, 8] },
  { key: 'T4', monthIndexes: [9, 10, 11] },
];
const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function getFileExtension(filename) {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }

  return filename.slice(lastDotIndex).toLowerCase();
}

function normalizeDateForInput(value) {
  if (!value) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
}

function isPdfFile(filename) {
  return getFileExtension(filename) === '.pdf';
}

function getMonthIndexFromInvoice(pdf) {
  const source = pdf.fecha || pdf.fecha_subida;
  if (!source) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    const monthPart = Number.parseInt(source.slice(5, 7), 10);
    if (monthPart >= 1 && monthPart <= 12) {
      return monthPart - 1;
    }
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getMonth();
}

function parseOptionalAmount(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateAmountWithTaxesFromImporte(importe, tipo) {
  const parsedImporte = parseOptionalAmount(importe);
  if (parsedImporte === null) {
    return '';
  }

  const multiplier = tipo === 'venta' ? 1.21 : 1.262;
  return Number((parsedImporte * multiplier).toFixed(2));
}

/**
 * PDFUploadSection component
 * Manages PDF uploads and displays thumbnails for an entity (proveedor or cliente)
 *
 * @param {Object} props
 * @param {string} props.tipo - 'compra' or 'venta'
 * @param {number} props.entidadId - ID of the entity (proveedor or cliente)
 * @param {string} props.entidadNombre - Name of the entity
 */
function PDFUploadSection({
  tipo,
  entidadId = null,
  entidadNombre,
  sectionLabel = 'Facturas',
  fileLabel = 'Factura',
  officeOnly = false,
}) {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openingFileId, setOpeningFileId] = useState(null);
  const [savingMetadataId, setSavingMetadataId] = useState(null);
  const [editingPdfId, setEditingPdfId] = useState(null);
  const [metadataForm, setMetadataForm] = useState({
    fecha: '',
    importe: '',
    importeIvaRe: '',
    vencimiento: '',
    pagada: false,
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { showToast } = useToast();
  const acceptedExtensions = officeOnly ? OFFICE_EXTENSIONS : ALLOWED_EXTENSIONS;
  const shouldAutoCalculateAmountWithTaxes = tipo === 'compra' || tipo === 'venta';
  const amountWithTaxesLabel = tipo === 'venta' ? 'Importe + IVA' : 'Importe + IVA + RE';
  const totalImporte = useMemo(
    () => pdfs.reduce((sum, pdf) => sum + parseEuroAmount(pdf.importe), 0),
    [pdfs]
  );
  const totalImporteIvaRe = useMemo(
    () => pdfs.reduce((sum, pdf) => sum + parseEuroAmount(pdf.importe_iva_re), 0),
    [pdfs]
  );
  const quarterSummary = useMemo(() => {
    const monthTotals = Array.from({ length: 12 }, () => ({
      importe: 0,
      amountWithTaxes: 0,
    }));

    pdfs.forEach((pdf) => {
      const monthIndex = getMonthIndexFromInvoice(pdf);
      if (monthIndex === null) {
        return;
      }

      const importe = parseOptionalAmount(pdf.importe);
      const amountWithTaxes = parseOptionalAmount(pdf.importe_iva_re);

      if (importe !== null) {
        monthTotals[monthIndex].importe += importe;
      }

      if (amountWithTaxes !== null) {
        monthTotals[monthIndex].amountWithTaxes += amountWithTaxes;
      }
    });

    return QUARTERS.map((quarter) => {
      const months = quarter.monthIndexes.map((monthIndex) => ({
        monthIndex,
        label: MONTH_NAMES[monthIndex],
        total: monthTotals[monthIndex],
      }));

      return {
        key: quarter.key,
        total: {
          importe: months.reduce((sum, month) => sum + month.total.importe, 0),
          amountWithTaxes: months.reduce((sum, month) => sum + month.total.amountWithTaxes, 0),
        },
        months,
      };
    });
  }, [pdfs]);

  const fetchPDFs = useCallback(async () => {
    if (tipo !== 'contabilidad' && !entidadId) {
      return [];
    }

    try {
      setLoading(true);
      const response = await window.electronAPI.facturas.getAllForEntidad(
        tipo === 'contabilidad' ? { tipo } : { tipo, entidadId }
      );

      if (response.success) {
        const rows = response.data || [];
        setPdfs(rows);
        return rows;
      }

      showToast(response.error?.message || 'Error al cargar archivos', 'error');
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      showToast('Error al cargar archivos', 'error');
    } finally {
      setLoading(false);
    }

    return [];
  }, [tipo, entidadId, showToast]);

  useEffect(() => {
    fetchPDFs();
  }, [fetchPDFs]);

  const startEditing = (pdf) => {
    const importeValue = pdf.importe ?? '';
    setEditingPdfId(pdf.id);
    setMetadataForm({
      fecha: normalizeDateForInput(pdf.fecha),
      importe: importeValue,
      importeIvaRe: shouldAutoCalculateAmountWithTaxes
        ? calculateAmountWithTaxesFromImporte(importeValue, tipo)
        : (pdf.importe_iva_re ?? ''),
      vencimiento: normalizeDateForInput(pdf.vencimiento),
      pagada: Boolean(pdf.pagada),
    });
  };

  const cancelEditing = () => {
    setEditingPdfId(null);
    setMetadataForm({
      fecha: '',
      importe: '',
      importeIvaRe: '',
      vencimiento: '',
      pagada: false,
    });
  };

  const handleSaveMetadata = async (pdfId) => {
    try {
      setSavingMetadataId(pdfId);

      const response = await window.electronAPI.facturas.updatePDFMetadata(pdfId, {
        fecha: metadataForm.fecha,
        importe: metadataForm.importe,
        importeIvaRe: shouldAutoCalculateAmountWithTaxes
          ? calculateAmountWithTaxesFromImporte(metadataForm.importe, tipo)
          : metadataForm.importeIvaRe,
        vencimiento: metadataForm.vencimiento,
        pagada: metadataForm.pagada,
      });

      if (!response.success) {
        showToast(
          response.error?.message || `Error al actualizar ${fileLabel.toLowerCase()}`,
          'error'
        );
        return;
      }

      showToast(`${fileLabel} actualizado correctamente`, 'success');
      await fetchPDFs();
      cancelEditing();
    } catch (error) {
      console.error('Error updating PDF metadata:', error);
      showToast(`Error al actualizar ${fileLabel.toLowerCase()}`, 'error');
    } finally {
      setSavingMetadataId(null);
    }
  };

  const handleFileSelect = async (event) => {
    const { target } = event;
    const files = Array.from(target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      const extension = getFileExtension(file.name);

      if (!acceptedExtensions.includes(extension)) {
        showToast(`"${file.name}" no es un tipo de archivo permitido`, 'error');
        return false;
      }

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
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
      const uploadedPdfIds = [];
      const uploadResponses = await Promise.all(
        validFiles.map(async (file) => {
          const payload = {
            tipo,
            filePath: file.path,
          };

          if (tipo !== 'contabilidad') {
            payload.entidadId = entidadId;
            payload.entidadNombre = entidadNombre;
          }

          const response = await window.electronAPI.facturas.uploadPDF(payload);

          return { file, response };
        })
      );

      const successCount = uploadResponses.reduce((count, { file, response }) => {
        if (response.success) {
          if (response.data?.id) {
            uploadedPdfIds.push(response.data.id);
          }
          return count + 1;
        }

        showToast(response.error?.message || `Error al subir "${file.name}"`, 'error');
        return count;
      }, 0);

      if (successCount > 0) {
        showToast(
          successCount === 1
            ? `1 ${fileLabel.toLowerCase()} subido correctamente`
            : `${successCount} archivos subidos correctamente`,
          'success'
        );
        const refreshedPdfs = await fetchPDFs();
        const latestUploadedId = uploadedPdfIds[uploadedPdfIds.length - 1];
        const latestUploadedPdf = refreshedPdfs.find((pdf) => pdf.id === latestUploadedId);
        if (latestUploadedPdf) {
          startEditing(latestUploadedPdf);
        }
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      showToast('Error al subir archivo', 'error');
    } finally {
      setUploading(false);
      target.value = '';
    }
  };

  const handleDelete = async (pdf) => {
    try {
      const response = await window.electronAPI.facturas.deletePDF(pdf.id);

      if (response.success) {
        showToast('Archivo eliminado correctamente', 'success');
        await fetchPDFs();
        setDeleteConfirm(null);
      } else {
        showToast(response.error?.message || 'Error al eliminar archivo', 'error');
      }
    } catch (error) {
      console.error('Error deleting PDF:', error);
      showToast('Error al eliminar archivo', 'error');
    }
  };

  const handleOpenFile = async (pdf) => {
    try {
      setOpeningFileId(pdf.id);

      if (typeof window.electronAPI?.facturas?.openStoredFile !== 'function') {
        showToast('Reinicia la aplicación para habilitar la apertura de archivos', 'info');
        return;
      }

      const response = await window.electronAPI.facturas.openStoredFile(pdf.ruta_relativa);

      if (!response.success) {
        showToast(response.error?.message || 'No se pudo abrir el archivo', 'error');
        return;
      }

      if (response.data?.revealedInFolder) {
        showToast('No se pudo abrir directamente; se mostró en su carpeta', 'info');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      const message = String(error?.message || '');

      if (message.includes('No handler registered for')) {
        showToast('Reinicia la aplicación para habilitar la apertura de archivos', 'info');
        return;
      }

      showToast(message || 'No se pudo abrir el archivo', 'error');
    } finally {
      setOpeningFileId(null);
    }
  };

  // Only show section if entity is being edited (has an ID)
  if (tipo !== 'contabilidad' && !entidadId) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
        <p className="text-sm text-neutral-600 text-center">
          Guarda el {tipo === 'venta' ? 'cliente' : 'proveedor'} primero para poder subir archivos
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-lg font-semibold text-neutral-900">
            {sectionLabel} ({pdfs.length})
          </h3>
        </div>
        <label
          htmlFor="pdf-upload"
          className={`px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors cursor-pointer ${
            uploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {uploading ? 'Subiendo...' : '+ Subir archivo'}
          <input
            id="pdf-upload"
            type="file"
            accept={acceptedExtensions.join(',')}
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {(tipo === 'compra' || tipo === 'venta') && (
        <div className="mb-4 overflow-x-auto border border-neutral-200 rounded-lg bg-neutral-50">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-neutral-100 text-neutral-700">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">
                  Periodo
                </th>
                <th scope="col" className="px-4 py-2 font-semibold text-right whitespace-nowrap">
                  Importe
                </th>
                <th scope="col" className="px-4 py-2 font-semibold text-right whitespace-nowrap">
                  {amountWithTaxesLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {quarterSummary.map((quarter) => (
                <React.Fragment key={quarter.key}>
                  <tr className="border-t border-neutral-200 bg-white">
                    <th scope="row" className="px-4 py-2 font-semibold text-neutral-900">
                      {quarter.key}
                    </th>
                    <td className="px-4 py-2 text-right font-semibold text-neutral-900 whitespace-nowrap">
                      {formatEuroAmount(quarter.total.importe)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-neutral-900 whitespace-nowrap">
                      {formatEuroAmount(quarter.total.amountWithTaxes)}
                    </td>
                  </tr>
                  {quarter.months.map((month) => (
                    <tr
                      key={`${quarter.key}-${month.monthIndex}`}
                      className="border-t border-neutral-200/70"
                    >
                      <th
                        scope="row"
                        className="px-4 py-1.5 pl-8 text-xs font-medium text-neutral-500"
                      >
                        {month.label}
                      </th>
                      <td className="px-4 py-1.5 text-right text-xs font-medium text-neutral-500 whitespace-nowrap">
                        {formatEuroAmount(month.total.importe)}
                      </td>
                      <td className="px-4 py-1.5 text-right text-xs font-medium text-neutral-500 whitespace-nowrap">
                        {formatEuroAmount(month.total.amountWithTaxes)}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="border-t-2 border-neutral-300 bg-neutral-100/70">
                <th scope="row" className="px-4 py-2 font-semibold text-primary">
                  Total anual
                </th>
                <td className="px-4 py-2 text-right font-semibold text-primary whitespace-nowrap">
                  {formatEuroAmount(totalImporte)}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-primary whitespace-nowrap">
                  {formatEuroAmount(totalImporteIvaRe)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <p className="text-neutral-500">Cargando archivos...</p>
        </div>
      )}

      {!loading && pdfs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-neutral-500">No hay archivos subidos</p>
        </div>
      )}

      {!loading && pdfs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pdfs.map((pdf) => (
            <div key={pdf.id} className="relative group">
              <div className="border border-neutral-200 rounded-lg p-2 hover:border-primary transition-colors bg-neutral-50">
                <button
                  type="button"
                  onClick={() => handleOpenFile(pdf)}
                  disabled={openingFileId === pdf.id}
                  className={`w-full text-left ${openingFileId === pdf.id ? 'opacity-75 cursor-wait' : ''}`}
                  title="Clic para abrir"
                >
                  {isPdfFile(pdf.nombre_original) ? (
                    <PDFThumbnail pdfPath={pdf.ruta_relativa} />
                  ) : (
                    <div className="h-[180px] rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-4xl text-neutral-500">
                      📄
                    </div>
                  )}
                </button>
                <div className="mt-2">
                  <p className="text-xs text-neutral-700 truncate" title={pdf.nombre_original}>
                    {pdf.nombre_original}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(pdf.fecha_subida).toLocaleDateString('es-ES')}
                  </p>
                  <p className="text-xs text-neutral-700 mt-1">
                    Fecha: {pdf.fecha ? normalizeDateForInput(pdf.fecha) : '—'}
                  </p>
                  <p className="text-xs text-neutral-700">
                    Importe:{' '}
                    {pdf.importe === null || pdf.importe === undefined || pdf.importe === ''
                      ? '—'
                      : formatEuroAmount(pdf.importe)}
                  </p>
                  <p className="text-xs text-neutral-700">
                    {amountWithTaxesLabel}:{' '}
                    {pdf.importe_iva_re === null ||
                    pdf.importe_iva_re === undefined ||
                    pdf.importe_iva_re === ''
                      ? '—'
                      : formatEuroAmount(pdf.importe_iva_re)}
                  </p>
                  <p className="text-xs text-neutral-700">
                    Vencimiento: {pdf.vencimiento ? normalizeDateForInput(pdf.vencimiento) : '—'}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        pdf.pagada ? 'bg-success' : 'bg-danger'
                      }`}
                      aria-label={pdf.pagada ? 'Pagada' : 'Pendiente'}
                    />
                    <span
                      className={`text-xs font-medium ${pdf.pagada ? 'text-success-700' : 'text-danger-700'}`}
                    >
                      {pdf.pagada ? 'Pagada' : 'Pendiente'}
                    </span>
                  </div>
                  {openingFileId === pdf.id && (
                    <p className="text-xs text-primary mt-1">Abriendo...</p>
                  )}

                  {editingPdfId === pdf.id ? (
                    <div className="mt-2 space-y-2 border-t border-neutral-200 pt-2">
                      <input
                        type="date"
                        value={metadataForm.fecha}
                        onChange={(event) =>
                          setMetadataForm((prev) => ({ ...prev, fecha: event.target.value }))
                        }
                        aria-label="Fecha"
                        className="w-full text-xs px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={metadataForm.importe}
                        onChange={(event) => {
                          const nextImporte = event.target.value;
                          setMetadataForm((prev) => ({
                            ...prev,
                            importe: nextImporte,
                            importeIvaRe: shouldAutoCalculateAmountWithTaxes
                              ? calculateAmountWithTaxesFromImporte(nextImporte, tipo)
                              : prev.importeIvaRe,
                          }));
                        }}
                        placeholder="Importe (ej. 123.45)"
                        className="w-full text-xs px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={metadataForm.importeIvaRe}
                        onChange={(event) =>
                          setMetadataForm((prev) => ({ ...prev, importeIvaRe: event.target.value }))
                        }
                        readOnly={shouldAutoCalculateAmountWithTaxes}
                        placeholder={`${amountWithTaxesLabel} (ej. 150.75)`}
                        className={`w-full text-xs px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary ${
                          shouldAutoCalculateAmountWithTaxes
                            ? 'bg-neutral-100 text-neutral-600 cursor-not-allowed'
                            : ''
                        }`}
                      />
                      <input
                        type="date"
                        value={metadataForm.vencimiento}
                        onChange={(event) =>
                          setMetadataForm((prev) => ({ ...prev, vencimiento: event.target.value }))
                        }
                        className="w-full text-xs px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <label
                        htmlFor={`pdf-pagada-${pdf.id}`}
                        className="flex items-center gap-2 text-xs text-neutral-700"
                      >
                        <input
                          id={`pdf-pagada-${pdf.id}`}
                          type="checkbox"
                          checked={metadataForm.pagada}
                          onChange={(event) =>
                            setMetadataForm((prev) => ({ ...prev, pagada: event.target.checked }))
                          }
                        />
                        Factura pagada
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveMetadata(pdf.id)}
                          disabled={savingMetadataId === pdf.id}
                          className="flex-1 text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                        >
                          {savingMetadataId === pdf.id ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={savingMetadataId === pdf.id}
                          className="flex-1 text-xs px-2 py-1 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(pdf)}
                      className="mt-2 text-xs px-2 py-1 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirm(pdf)}
                className="absolute top-1 right-1 bg-danger text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger/90"
                title="Eliminar archivo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="¿Eliminar este archivo?"
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
  tipo: PropTypes.oneOf(['compra', 'venta', 'arreglos', 'contabilidad']).isRequired,
  entidadId: PropTypes.number,
  entidadNombre: PropTypes.string.isRequired,
  sectionLabel: PropTypes.string,
  fileLabel: PropTypes.string,
  officeOnly: PropTypes.bool,
};

export default PDFUploadSection;
