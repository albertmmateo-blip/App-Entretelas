import React from 'react';

/**
 * EmptyState - Reusable empty state component for entry lists
 *
 * Displays an icon, title, and message when there are no entries to show.
 * Adapts messaging based on whether a search query is active.
 *
 * @param {Object} props
 * @param {string} props.icon - Emoji icon to display (e.g., '📞', '📭')
 * @param {string} props.title - Title text (e.g., 'Llamar', 'Notas')
 * @param {boolean} props.hasSearchQuery - Whether a search query is active
 *
 * @example
 * <EmptyState
 *   icon="📞"
 *   title="Llamar"
 *   hasSearchQuery={!!searchQuery}
 * />
 */
function EmptyState({ icon, title, hasSearchQuery }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-6xl mb-4">{icon}</span>
      <h2 className="text-xl font-semibold text-neutral-700 mb-2">
        {hasSearchQuery ? 'No se encontraron resultados' : `Sin ${title.toLowerCase()}`}
      </h2>
      <p className="text-neutral-500 mb-4">
        {hasSearchQuery
          ? 'Prueba con otros términos de búsqueda'
          : 'No hay ninguna entrada todavía. Haz clic en "Nueva entrada" para añadir la primera.'}
      </p>
    </div>
  );
}

export default EmptyState;
