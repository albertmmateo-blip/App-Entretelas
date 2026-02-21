import * as pdfjsLib from 'pdfjs-dist';
// Import the worker using Vite's ?url suffix to get a proper URL reference
// This ensures Vite handles the worker file correctly during both dev and build
// eslint-disable-next-line import/no-unresolved
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js Web Worker
// Use the imported URL to ensure proper resolution in Vite's dev server and production builds
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default pdfjsLib;
