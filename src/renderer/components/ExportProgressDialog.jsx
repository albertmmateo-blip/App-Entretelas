import React, { useEffect, useState } from 'react';

/**
 * Pixel-art thread spool animation rendered as a CSS-animated SVG.
 * The spool spins and thread unwinds as the export progresses.
 */
function SpoolAnimation() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 4), 180);
    return () => clearInterval(id);
  }, []);

  // 4-frame pixel-art spool: the notch rotates
  const notchAngles = [0, 90, 180, 270];
  const angle = notchAngles[frame];

  // Thread tail wiggles
  const tailDY = [0, -1, 0, 1][frame];

  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 32 32"
      style={{ imageRendering: 'pixelated' }}
      aria-hidden="true"
    >
      {/* Spool body — barrel */}
      <rect x="10" y="8" width="12" height="16" rx="1" fill="#c87533" />
      {/* Spool flanges */}
      <rect x="8" y="7" width="16" height="3" rx="1" fill="#a0522d" />
      <rect x="8" y="22" width="16" height="3" rx="1" fill="#a0522d" />
      {/* Thread wraps */}
      <rect x="11" y="11" width="10" height="2" fill="#e85050" />
      <rect x="11" y="14" width="10" height="2" fill="#d94040" />
      <rect x="11" y="17" width="10" height="2" fill="#e85050" />
      <rect x="11" y="20" width="10" height="2" fill="#d94040" />
      {/* Center hole with rotating notch */}
      <circle cx="16" cy="16" r="2" fill="#8a3c07" />
      <rect
        x="15.5"
        y="14"
        width="1"
        height="4"
        fill="#fbbf6e"
        style={{
          transformOrigin: '16px 16px',
          transform: `rotate(${angle}deg)`,
        }}
      />
      {/* Thread leading off spool to the right, wiggling */}
      <line
        x1="22"
        y1={16 + tailDY * 0.5}
        x2="28"
        y2={12 + tailDY}
        stroke="#e85050"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="28"
        y1={12 + tailDY}
        x2="31"
        y2={13 + tailDY * 0.5}
        stroke="#e85050"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * XP-style popup dialog shown during data export.
 * Displays a pixel-art thread spool animation.
 */
function ExportProgressDialog({ progress }) {
  const hasBytesInfo =
    progress && typeof progress.processedBytes === 'number' && progress.totalBytes > 0;
  const pct = hasBytesInfo
    ? Math.min(99, Math.round((progress.processedBytes / progress.totalBytes) * 100))
    : 0;

  return (
    <div className="export-progress-overlay">
      <div className="export-progress-dialog">
        {/* XP-style title bar */}
        <div className="export-progress-titlebar">
          <span className="export-progress-titlebar-text">Exportando...</span>
        </div>

        {/* Content */}
        <div className="export-progress-body">
          <SpoolAnimation />

          <p className="export-progress-label">Preparando archivo... {pct}%</p>

          {/* Progress bar track */}
          <div className="export-progress-track">
            <div className="export-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportProgressDialog;
