import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PDFUploadSection from '../../src/renderer/components/PDFUploadSection';

const showToastMock = vi.fn();

vi.mock('../../src/renderer/hooks/useToast', () => ({
  default: () => ({ showToast: showToastMock }),
}));

vi.mock('../../src/renderer/components/PDFThumbnail', () => ({
  default: ({ pdfPath }) => <div data-testid="pdf-thumbnail">{pdfPath}</div>,
}));

vi.mock('../../src/renderer/components/ConfirmDialog', () => ({
  default: () => null,
}));

function createFile(name, size = 1024, path = `C:/temp/${name}`) {
  const file = new File(['x'.repeat(Math.min(size, 1024))], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size, configurable: true });
  Object.defineProperty(file, 'path', { value: path, configurable: true });
  return file;
}

function setupMocks({
  initialList = [],
  uploadImpl = async () => ({ success: true }),
  getAllImpl,
  updateMetadataImpl = async () => ({ success: true }),
} = {}) {
  const getAllForEntidad = vi.fn(
    getAllImpl || (async () => ({ success: true, data: initialList }))
  );
  const uploadPDF = vi.fn(uploadImpl);
  const updatePDFMetadata = vi.fn(updateMetadataImpl);
  const deletePDF = vi.fn(async () => ({ success: true }));

  global.window.electronAPI = {
    facturas: {
      getAllForEntidad,
      uploadPDF,
      updatePDFMetadata,
      deletePDF,
    },
  };

  return {
    getAllForEntidad,
    uploadPDF,
    updatePDFMetadata,
    deletePDF,
  };
}

describe('PDFUploadSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads multiple selected PDF files', async () => {
    const { uploadPDF, getAllForEntidad } = setupMocks();
    const user = userEvent.setup();

    render(<PDFUploadSection tipo="compra" entidadId={1} entidadNombre="Proveedor 1" />);

    const input = document.getElementById('pdf-upload');
    const fileA = createFile('factura-a.pdf', 1024, 'C:/temp/factura-a.pdf');
    const fileB = createFile('factura-b.pdf', 2048, 'C:/temp/factura-b.pdf');

    await user.upload(input, [fileA, fileB]);

    await waitFor(() => {
      expect(uploadPDF).toHaveBeenCalledTimes(2);
    });

    expect(uploadPDF).toHaveBeenNthCalledWith(1, {
      tipo: 'compra',
      entidadId: 1,
      entidadNombre: 'Proveedor 1',
      filePath: 'C:/temp/factura-a.pdf',
    });
    expect(uploadPDF).toHaveBeenNthCalledWith(2, {
      tipo: 'compra',
      entidadId: 1,
      entidadNombre: 'Proveedor 1',
      filePath: 'C:/temp/factura-b.pdf',
    });

    expect(showToastMock).toHaveBeenCalledWith('2 archivos subidos correctamente', 'success');
    expect(getAllForEntidad).toHaveBeenCalledTimes(2);
  });

  it('skips unsupported files and uploads valid files from mixed selection', async () => {
    const { uploadPDF } = setupMocks();

    render(<PDFUploadSection tipo="venta" entidadId={7} entidadNombre="Cliente 7" />);

    const input = document.getElementById('pdf-upload');
    const invalidFile = createFile('nota.exe', 1024, 'C:/temp/nota.exe');
    const validPdf = createFile('ok.pdf', 1024, 'C:/temp/ok.pdf');

    fireEvent.change(input, { target: { files: [invalidFile, validPdf] } });

    await waitFor(() => {
      expect(uploadPDF).toHaveBeenCalledTimes(1);
    });

    expect(uploadPDF).toHaveBeenCalledWith({
      tipo: 'venta',
      entidadId: 7,
      entidadNombre: 'Cliente 7',
      filePath: 'C:/temp/ok.pdf',
    });
    expect(showToastMock).toHaveBeenCalledWith(
      '"nota.exe" no es un tipo de archivo permitido',
      'error'
    );
    expect(showToastMock).toHaveBeenCalledWith('1 factura subido correctamente', 'success');
  });

  it('rejects oversized files and does not upload when all selected files are invalid', async () => {
    const { uploadPDF } = setupMocks();

    render(<PDFUploadSection tipo="compra" entidadId={3} entidadNombre="Proveedor 3" />);

    const input = document.getElementById('pdf-upload');
    const tooLargePdf = createFile('enorme.pdf', 52428801, 'C:/temp/enorme.pdf');
    const invalidType = createFile('imagen.png', 1000, 'C:/temp/imagen.png');

    fireEvent.change(input, { target: { files: [tooLargePdf, invalidType] } });

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('"enorme.pdf" supera los 50 MB', 'error');
    });
    expect(showToastMock).toHaveBeenCalledWith(
      '"imagen.png" no es un tipo de archivo permitido',
      'error'
    );
    expect(uploadPDF).not.toHaveBeenCalled();
  });

  it('continues uploading remaining files when one upload fails', async () => {
    const { uploadPDF } = setupMocks({
      uploadImpl: vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: { message: 'Fallo archivo 2' } })
        .mockResolvedValueOnce({ success: true }),
    });
    const user = userEvent.setup();

    render(<PDFUploadSection tipo="venta" entidadId={11} entidadNombre="Cliente 11" />);

    const input = document.getElementById('pdf-upload');
    const file1 = createFile('f1.pdf', 1024, 'C:/temp/f1.pdf');
    const file2 = createFile('f2.pdf', 1024, 'C:/temp/f2.pdf');
    const file3 = createFile('f3.pdf', 1024, 'C:/temp/f3.pdf');

    await user.upload(input, [file1, file2, file3]);

    await waitFor(() => {
      expect(uploadPDF).toHaveBeenCalledTimes(3);
    });

    expect(showToastMock).toHaveBeenCalledWith('Fallo archivo 2', 'error');
    expect(showToastMock).toHaveBeenCalledWith('2 archivos subidos correctamente', 'success');
  });

  it('shows fetch error when initial list load fails', async () => {
    setupMocks({
      getAllImpl: async () => ({ success: false, error: { message: 'No se pudo cargar' } }),
    });

    render(<PDFUploadSection tipo="compra" entidadId={2} entidadNombre="Proveedor 2" />);

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('No se pudo cargar', 'error');
    });
  });

  it('shows metadata fields and allows updating payment status', async () => {
    const { updatePDFMetadata } = setupMocks({
      initialList: [
        {
          id: 21,
          ruta_relativa: 'compra/proveedor/factura.pdf',
          nombre_original: 'factura.pdf',
          fecha_subida: '2026-02-20T09:00:00.000Z',
          importe: 100,
          importe_iva_re: 121,
          vencimiento: '2026-03-15',
          pagada: 0,
        },
      ],
    });
    const user = userEvent.setup();

    render(<PDFUploadSection tipo="compra" entidadId={1} entidadNombre="Proveedor 1" />);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Importe:');
      expect(document.body.textContent).toContain('Importe+IVA+RE:');
      expect(document.body.textContent).toContain('Vencimiento: 2026-03-15');
      expect(document.body.textContent).toContain('Pendiente');
    });

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('checkbox', { name: 'Factura pagada' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(updatePDFMetadata).toHaveBeenCalledWith(21, {
        importe: 100,
        importeIvaRe: 121,
        vencimiento: '2026-03-15',
        pagada: true,
      });
    });
    expect(showToastMock).toHaveBeenCalledWith('Factura actualizado correctamente', 'success');
  });

  it('loads contabilidad files without entidadId and uploads office file without folder payload', async () => {
    const { getAllForEntidad, uploadPDF } = setupMocks();
    const user = userEvent.setup();

    render(
      <PDFUploadSection
        tipo="contabilidad"
        entidadNombre="Contabilidad"
        officeOnly
        fileLabel="Archivo"
      />
    );

    await waitFor(() => {
      expect(getAllForEntidad).toHaveBeenCalledWith({ tipo: 'contabilidad' });
    });

    const input = document.getElementById('pdf-upload');
    const officeFile = createFile('resumen.docx', 1024, 'C:/temp/resumen.docx');

    await user.upload(input, officeFile);

    await waitFor(() => {
      expect(uploadPDF).toHaveBeenCalledWith({
        tipo: 'contabilidad',
        filePath: 'C:/temp/resumen.docx',
      });
    });
  });

  it('rejects pdf files when officeOnly mode is enabled', async () => {
    const { uploadPDF } = setupMocks();

    render(
      <PDFUploadSection
        tipo="contabilidad"
        entidadNombre="Contabilidad"
        officeOnly
        fileLabel="Archivo"
      />
    );

    const input = document.getElementById('pdf-upload');
    const pdfFile = createFile('factura.pdf', 1024, 'C:/temp/factura.pdf');

    fireEvent.change(input, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        '"factura.pdf" no es un tipo de archivo permitido',
        'error'
      );
    });
    expect(uploadPDF).not.toHaveBeenCalled();
  });
});
