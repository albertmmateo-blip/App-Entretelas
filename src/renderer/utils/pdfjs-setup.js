import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js Web Worker
// Use a local worker file to comply with Content Security Policy (CSP)
// The worker file is in the public directory and served as a static asset
// Use import.meta.env.BASE_URL to ensure proper path in both dev and production
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

export default pdfjsLib;
