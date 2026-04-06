import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Lightbox modal for displaying a stock article photo.
 * Shows the image centered on a dimmed backdrop. Close via Esc, backdrop click, or ✕ button.
 *
 * Props:
 *  - src: string (object URL or data URL)
 *  - alt: string
 *  - onClose: () => void
 *  - onDelete: (() => void) | null  — optional; shows delete button if provided
 */
export default function PhotoModal({ src, alt, onClose, onDelete }) {
  const backdropRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Foto del artículo'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
    >
      <div className="relative max-h-[90vh] max-w-[90vw] flex flex-col items-center">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-900 shadow-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <img
          src={src}
          alt={alt || 'Foto del artículo'}
          className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-xl"
          draggable={false}
        />

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="mt-3 rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-blue-900 shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Eliminar foto
          </button>
        )}
      </div>
    </div>
  );
}
