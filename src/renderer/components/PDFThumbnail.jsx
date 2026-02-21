import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import pdfjsLib from '../utils/pdfjs-setup';
import { normalizePDFBytes } from '../utils/normalizePDFBytes';

// Constants
const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_HEIGHT = 210;
const RENDER_TIMEOUT_MS = 5000;
const MAX_CANVAS_SIZE = 4096;

/**
 * PDFThumbnail component
 * Lazily generates and displays a thumbnail for a PDF file.
 * Uses IntersectionObserver to only load when component is in viewport.
 *
 * @param {Object} props
 * @param {string} props.pdfPath - Relative path from facturas_pdf table
 */
function PDFThumbnail({ pdfPath }) {
  const [loading, setLoading] = useState(true);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState(null);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Set up IntersectionObserver to detect when component enters viewport
  useEffect(() => {
    const currentRef = containerRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          // Once we've intersected, we can disconnect the observer
          observer.disconnect();
        }
      },
      {
        threshold: 0.1, // Trigger when 10% of the component is visible
      }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  // Generate thumbnail when component is in viewport
  useEffect(() => {
    if (!isIntersecting || !pdfPath) {
      return undefined;
    }

    let isMounted = true;

    async function generateThumbnail() {
      try {
        setLoading(true);
        setError(null);

        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('PDF rendering timed out')), RENDER_TIMEOUT_MS);
        });

        // Create the actual rendering promise
        const renderPromise = (async () => {
          let pdf = null;
          try {
            // Get PDF bytes from main process
            const response = await window.electronAPI.facturas.getPDFBytes(pdfPath);

            if (!response.success) {
              throw new Error(response.error?.message || 'Failed to load PDF');
            }

            // Normalize the IPC response payload into a Uint8Array that PDF.js can
            // consume.  The main process returns a fresh ArrayBuffer to avoid any
            // Buffer structured-clone ambiguity, but we handle all possible shapes
            // here defensively.
            const pdfData = normalizePDFBytes(response.data);

            if (import.meta.env.DEV) {
              // eslint-disable-next-line no-console
              console.debug(`[PDFThumbnail] Loaded ${pdfData.byteLength} bytes for "${pdfPath}"`);
            }

            // Pass options explicitly to ensure proper initialization in Electron/Vite environment
            const loadingTask = pdfjsLib.getDocument({
              data: pdfData,
              verbosity: 0, // Suppress warnings
            });
            pdf = await loadingTask.promise;

            // Get first page
            const page = await pdf.getPage(1);

            // Get initial viewport to calculate dimensions
            const viewport = page.getViewport({ scale: 1 });

            // Check if the page dimensions exceed maximum canvas size
            if (viewport.width > MAX_CANVAS_SIZE || viewport.height > MAX_CANVAS_SIZE) {
              throw new Error(
                `PDF page dimensions (${Math.floor(viewport.width)}x${Math.floor(viewport.height)}) exceed maximum canvas size (${MAX_CANVAS_SIZE}x${MAX_CANVAS_SIZE})`
              );
            }

            // Calculate scale to fit thumbnail dimensions
            const scale = THUMBNAIL_WIDTH / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            // Verify scaled dimensions don't exceed canvas limits
            if (scaledViewport.width > MAX_CANVAS_SIZE || scaledViewport.height > MAX_CANVAS_SIZE) {
              throw new Error('Scaled PDF dimensions exceed maximum canvas size');
            }

            // Create canvas element
            const canvas = document.createElement('canvas');
            canvas.width = THUMBNAIL_WIDTH;
            canvas.height = THUMBNAIL_HEIGHT;
            const context = canvas.getContext('2d');

            // Render PDF page to canvas
            await page.render({
              canvasContext: context,
              viewport: scaledViewport,
            }).promise;

            // Convert canvas to data URL
            const dataUrl = canvas.toDataURL('image/png');

            return dataUrl;
          } finally {
            // Clean up PDF document to prevent memory leaks
            if (pdf) {
              pdf.destroy();
            }
          }
        })();

        // Race between rendering and timeout
        const dataUrl = await Promise.race([renderPromise, timeoutPromise]);

        if (isMounted) {
          setThumbnailDataUrl(dataUrl);
          setLoading(false);
        }
      } catch (err) {
        // Ensure error is an Error object for consistent handling
        const normalizedError = err instanceof Error ? err : new Error(String(err));
        console.error('Error generating PDF thumbnail:', normalizedError);
        if (isMounted) {
          setError(normalizedError);
          setLoading(false);
        }
      }
    }

    generateThumbnail();

    return () => {
      isMounted = false;
    };
  }, [isIntersecting, pdfPath]);

  // Render loading state
  if (loading) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center bg-neutral-100 rounded"
        style={{ width: `${THUMBNAIL_WIDTH}px`, height: `${THUMBNAIL_HEIGHT}px` }}
      >
        <span className="text-neutral-500 text-sm">Loading...</span>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center bg-error-50 border border-error-200 rounded p-2"
        style={{ width: `${THUMBNAIL_WIDTH}px`, height: `${THUMBNAIL_HEIGHT}px` }}
        title={error.message}
      >
        <span className="text-error-700 text-xs text-center">Failed to load thumbnail</span>
      </div>
    );
  }

  // Render thumbnail
  return (
    <div ref={containerRef}>
      <img
        src={thumbnailDataUrl}
        alt="PDF Thumbnail"
        className="rounded border border-neutral-200"
        style={{ width: `${THUMBNAIL_WIDTH}px`, height: `${THUMBNAIL_HEIGHT}px` }}
      />
    </div>
  );
}

PDFThumbnail.propTypes = {
  pdfPath: PropTypes.string.isRequired,
};

export default PDFThumbnail;
