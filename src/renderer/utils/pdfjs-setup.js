import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js Web Worker
// Use a local worker file to comply with Content Security Policy (CSP)
// The worker file is copied from node_modules to public directory during build
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default pdfjsLib;
