import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js Web Worker
// Use a CDN-hosted worker to avoid potential issues with Vite/Electron bundling
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs`;

export default pdfjsLib;
