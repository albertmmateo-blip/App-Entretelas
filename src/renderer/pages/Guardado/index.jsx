import React from 'react';

export default function Guardado() {
  return (
    <div className="xp-content-panel" style={{ padding: '24px' }}>
      <div className="xp-inset-panel" style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>�</div>
        <h2
          style={{
            margin: '0 0 8px',
            color: 'var(--logo-brown)',
            fontFamily: 'Tahoma, sans-serif',
            fontSize: '18px',
          }}
        >
          Guardado
        </h2>
        <p
          style={{
            margin: 0,
            color: 'var(--text-secondary)',
            fontFamily: 'Tahoma, sans-serif',
            fontSize: '13px',
          }}
        >
          Registro de ubicaciones físicas en la tienda. Próximamente.
        </p>
      </div>
    </div>
  );
}
