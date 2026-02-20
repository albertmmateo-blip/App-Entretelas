# Shared Entry Components

This directory contains reusable UI primitives for entry-based screens in the application.

## Components

### EntriesGrid

A responsive grid layout component for displaying entry cards.

**Breakpoints:**

- Mobile: 1 column (`grid-cols-1`)
- Medium (md): 2 columns (`md:grid-cols-2`)
- Large (lg): 3 columns (`lg:grid-cols-3`)

**Usage:**

```jsx
import { EntriesGrid } from '../../components/entries';

<EntriesGrid>
  {entries.map((entry) => (
    <EntryCard key={entry.id} {...entry} />
  ))}
</EntriesGrid>;
```

### EntryCard

A standardized card component for individual entries with support for:

- Urgente indicator (red border + warning icon)
- Configurable content via children
- Action menu button
- Click handler for navigation

**Props:**

- `urgente` (boolean): Whether the entry is marked as urgent
- `onClick` (function): Handler for card click
- `onActionClick` (function, optional): Handler for action menu button
- `children` (ReactNode): Card content

**Usage:**

```jsx
import { EntryCard } from '../../components/entries';

<EntryCard
  urgente={entry.urgente}
  onClick={() => navigate(`/llamar/${entry.id}`)}
  onActionClick={(e) => openActionMenu(e, entry)}
>
  <h3 className="text-lg font-semibold">{entry.asunto}</h3>
  <div className="text-sm text-neutral-700">
    <div>
      <span className="font-medium">Contacto:</span> {entry.contacto}
    </div>
    <div className="text-neutral-500">
      {new Date(entry.fecha_creacion).toLocaleDateString('es-ES')}
    </div>
  </div>
</EntryCard>;
```

### EmptyState

A reusable empty state component that adapts messaging based on search context.

**Props:**

- `icon` (string): Emoji icon to display (e.g., '📞', '📭')
- `title` (string): Entry type name (e.g., 'entradas', 'notas')
- `hasSearchQuery` (boolean): Whether a search query is active

**Usage:**

```jsx
import { EmptyState } from '../../components/entries';

<EmptyState icon="📞" title="entradas" hasSearchQuery={!!searchQuery} />;
```

### LoadingState

A loading skeleton that matches the grid layout with animated placeholders.

**Usage:**

```jsx
import { LoadingState } from '../../components/entries';

if (loading && entries.length === 0) {
  return <LoadingState />;
}
```

## Design Principles

1. **Consistency**: All entry-based screens (Llamar, Notas, etc.) should use these components to ensure a consistent UI/UX.

2. **Composability**: Components are designed to be flexible and allow module-specific customization through children/props.

3. **Responsive by default**: Grid breakpoints are standardized across the application.

4. **Single source of truth**: Card styling, urgente indicators, and empty states are defined once and reused everywhere.

## Implementation Notes

- The grid uses Tailwind CSS utility classes for responsive layout
- Urgente entries show a red border (`border-2 border-danger`) and warning icon (⚠) in the top-right
- Action menu buttons use the vertical ellipsis character (⋮)
- Empty states adapt messaging based on search context
- Loading skeletons use Tailwind's `animate-pulse` for smooth transitions
