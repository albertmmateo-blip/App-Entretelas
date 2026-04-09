import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lightbox modal for displaying article photos with slideshow navigation.
 *
 * Supports two usage modes:
 *  1. Single photo (legacy): pass `src` as a string
 *  2. Multi-photo slideshow: pass `photos` as [{ src, fotoId }, ...]
 *
 * Props:
 *  - src: string — single photo URL (legacy, used when `photos` is not provided)
 *  - photos: Array<{ src: string, fotoId: number }> — multiple photos for slideshow
 *  - alt: string
 *  - onClose: () => void
 *  - onDelete: ((fotoId?: number) => void) | null — delete current photo
 *  - onAdd: (() => void) | null — add another photo (slideshow mode only)
 */
export default function PhotoModal({ src, photos, alt, onClose, onDelete, onAdd }) {
  const backdropRef = useRef(null);

  // Normalize to array for uniform handling
  const photoList = photos || (src ? [{ src, fotoId: null }] : []);
  const isSlideshow = photoList.length > 1;

  const [currentIndex, setCurrentIndex] = useState(0);

  // Clamp index when photos array changes (e.g. after delete)
  useEffect(() => {
    if (currentIndex >= photoList.length && photoList.length > 0) {
      setCurrentIndex(photoList.length - 1);
    }
  }, [photoList.length, currentIndex]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : photoList.length - 1));
  }, [photoList.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < photoList.length - 1 ? i + 1 : 0));
  }, [photoList.length]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
      if (isSlideshow && e.key === 'ArrowLeft') goPrev();
      if (isSlideshow && e.key === 'ArrowRight') goNext();
    },
    [onClose, isSlideshow, goPrev, goNext]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (photoList.length === 0) return null;
  const current = photoList[Math.min(currentIndex, photoList.length - 1)];

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
          className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-700 shadow-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Previous arrow */}
        {isSlideshow && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-[-48px] top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Foto anterior"
          >
            ◀
          </button>
        )}

        {/* Next arrow */}
        {isSlideshow && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-[-48px] top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Foto siguiente"
          >
            ▶
          </button>
        )}

        <img
          src={current.src}
          alt={alt || 'Foto del artículo'}
          className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-xl"
          draggable={false}
        />

        {/* Photo counter */}
        {photoList.length > 1 && (
          <div className="mt-2 text-sm text-white/80 select-none">
            {Math.min(currentIndex, photoList.length - 1) + 1} / {photoList.length}
          </div>
        )}

        {/* Action buttons */}
        {(onDelete || onAdd) && (
          <div className="mt-2 flex gap-3 items-center">
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(current.fotoId);
                }}
                className="rounded bg-danger px-4 py-1.5 text-sm font-medium text-white shadow hover:bg-danger/90 focus:outline-none focus:ring-2 focus:ring-danger"
              >
                Eliminar foto
              </button>
            )}
            {onAdd && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-white shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                + Añadir foto
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
