import React from 'react';

/**
 * EntriesGrid - Responsive grid layout for entry cards
 *
 * A standardized grid component that displays entry cards in a responsive layout.
 * Uses breakpoints: 1 column on mobile, 2 on medium screens, 3 on large screens.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card components to display in the grid
 *
 * @example
 * <EntriesGrid>
 *   <EntryCard {...entry1Props} />
 *   <EntryCard {...entry2Props} />
 * </EntriesGrid>
 */
function EntriesGrid({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}

export default EntriesGrid;
