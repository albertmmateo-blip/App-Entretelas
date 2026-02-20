import React from 'react';

/**
 * LoadingState - Reusable loading skeleton for entry grids
 *
 * Displays an animated skeleton that matches the grid layout,
 * showing placeholder cards with pulse animation.
 *
 * @example
 * <LoadingState />
 */
function LoadingState() {
  return (
    <div className="p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-neutral-200 rounded w-1/4 mb-4" />
        <div className="h-10 bg-neutral-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-40 bg-neutral-200 rounded" />
          <div className="h-40 bg-neutral-200 rounded" />
          <div className="h-40 bg-neutral-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export default LoadingState;
