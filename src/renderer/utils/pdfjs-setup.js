import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js Web Worker
// Use Vite's ?url import suffix to get the worker file as a static asset URL
// This prevents Vite from trying to bundle the worker as a module
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default pdfjsLib;
