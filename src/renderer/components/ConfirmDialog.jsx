import React, { useEffect } from 'react';

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  confirmDanger = false,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        const tagName = event.target?.tagName;
        if (tagName === 'TEXTAREA') {
          return;
        }
        event.preventDefault();
        onConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, onConfirm]);

  return (
    <div
      data-confirm-dialog="true"
      role="alertdialog"
      aria-modal="true"
      className="xp-modal-overlay"
    >
      <div className="xp-dialog max-w-md w-full mx-4">
        <div className="xp-dialog__titlebar">
          <span className="xp-dialog__titlebar-text">{title}</span>
        </div>
        <div className="xp-dialog__body items-stretch">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-sm text-neutral-700 m-0">{message}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2">
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-white ${confirmDanger ? 'bg-danger' : 'bg-primary'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
