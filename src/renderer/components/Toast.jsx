import React, { useEffect } from 'react';

function Toast({ id, message, type = 'info', onDismiss }) {
  useEffect(() => {
    // Success messages auto-dismiss faster (2s) to not block rapid entry creation
    // Error and info messages stay longer (5s) as they need attention
    const duration = type === 'success' ? 2000 : 5000;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, onDismiss, type]);

  const typeStyles = {
    success: 'bg-success-100 text-success-700 border-success-200',
    error: 'bg-danger-100 text-danger-700 border-danger-200',
    info: 'bg-primary-100 text-primary-700 border-primary-200',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg mb-3 ${typeStyles[type]}`}
    >
      <span className="text-xl font-bold">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}

export default Toast;
