import React from 'react';
import { URGENTE_STYLE } from '../../utils/urgente';

/**
 * EntryCard - Standardized card component for entry lists
 *
 * A reusable card shell that supports:
 * - Urgente indicator (red border + warning icon)
 * - Configurable content via children or render props
 * - Action menu button
 * - Click handler for navigation
 *
 * @param {Object} props
 * @param {boolean} props.urgente - Whether entry is marked as urgent
 * @param {Function} props.onClick - Handler when card is clicked
 * @param {React.ReactNode} props.children - Card content
 * @param {Function} props.onActionClick - Handler for action menu button click
 *
 * @example
 * <EntryCard
 *   urgente={true}
 *   onClick={() => navigate('/llamar/123')}
 *   onActionClick={(e) => handleMenu(e)}
 * >
 *   <h3 className="text-lg font-semibold">Title</h3>
 *   <p>Content...</p>
 * </EntryCard>
 */
function EntryCard({ urgente, onClick, children, onActionClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4 relative text-left ${
        urgente ? '' : 'bg-neutral-100 border border-neutral-200'
      }`}
      style={urgente ? URGENTE_STYLE : undefined}
    >
      {/* Urgente indicator */}
      {urgente ? (
        <div className="absolute top-2 right-2">
          <span className="text-danger font-bold text-xl" title="Urgente">
            ⚠️
          </span>
        </div>
      ) : null}

      {/* Content */}
      <div className="pr-8">{children}</div>

      {/* Actions button */}
      {onActionClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onActionClick(e);
          }}
          className="absolute bottom-2 right-2 text-neutral-500 hover:text-neutral-700 px-2 py-1"
          aria-label="Abrir menú de acciones"
        >
          ⋮
        </button>
      )}
    </div>
  );
}

export default EntryCard;
