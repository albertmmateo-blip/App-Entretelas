import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js Web Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

export default pdfjsLib;
