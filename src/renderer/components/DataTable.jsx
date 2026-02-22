import React, { useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 100;

function getRowBackgroundClass(isUrgente, rowIndex) {
  if (isUrgente) {
    return 'bg-danger/10 hover:bg-danger/15';
  }
  if (rowIndex % 2 === 1) {
    return 'bg-sky-50/80 hover:bg-sky-100/70';
  }
  return 'bg-white hover:bg-sky-100/70';
}

function DataTable({ columns, data, onRowClick, renderActions, initialSort, rowClassName }) {
  const sortableColumns = columns.filter((col) => col.sortable);
  const defaultSortFromColumns = sortableColumns.length
    ? { key: sortableColumns[0].key, direction: 'asc' }
    : null;
  const defaultSort = initialSort || defaultSortFromColumns;

  const [sortConfig, setSortConfig] = useState(defaultSort);
  const [currentPage, setCurrentPage] = useState(1);
  const [menuState, setMenuState] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [data, sortConfig]);

  useEffect(() => {
    const handleClick = () => setMenuState(null);
    if (menuState) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
    return undefined;
  }, [menuState]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    const { key, direction } = sortConfig;
    return [...data].sort((a, b) => {
      // Primary sort: urgent entries always first
      const aUrgente = a.urgente ? 1 : 0;
      const bUrgente = b.urgente ? 1 : 0;
      if (bUrgente !== aUrgente) {
        return bUrgente - aUrgente; // Descending: urgent (1) before non-urgent (0)
      }

      // Secondary sort: by selected column
      const column = columns.find((col) => col.key === key);
      const getValue = column?.sortValue || ((row) => row[key]);
      let aVal = getValue(a);
      let bVal = getValue(b);

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [columns, data, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / ITEMS_PER_PAGE));
  const paginatedData = sortedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (key) => {
    if (sortConfig?.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const renderCellContent = (column, row) => {
    const value = row[column.key];
    if (column.render) {
      return column.render(value, row);
    }
    return value ?? '';
  };

  const renderSortIndicator = (column) => {
    if (!column.sortable) return null;
    if (sortConfig?.key !== column.key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-sky-200 border-b border-sky-300">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-right">
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className="w-full text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 flex items-center justify-end gap-1 transition-colors"
                  >
                    {column.label}
                    {renderSortIndicator(column)}
                  </button>
                ) : (
                  <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-600 text-right">
                    {column.label}
                  </span>
                )}
              </th>
            ))}
            {renderActions && (
              <th className="px-4 py-3 text-center">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Acciones
                </span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, index) => {
            const isUrgente = Boolean(row.urgente);
            // Create a unique key that handles cases where multiple data sources
            // (e.g., different modules) might have overlapping IDs
            const rowKey =
              row.type && row.id ? `${row.type}-${row.id}` : (row.id ?? row.key ?? `row-${index}`);
            return (
              <tr
                key={rowKey}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-neutral-100 last:border-b-0 ${getRowBackgroundClass(isUrgente, index)} transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName ? rowClassName(row) : ''}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 text-sm text-neutral-800 align-top text-right ${
                      isUrgente ? 'font-medium' : ''
                    }`}
                  >
                    {renderCellContent(column, row)}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuState({ row, x: e.clientX, y: e.clientY });
                      }}
                      className="text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded px-2 py-1 transition-colors"
                      aria-label="Abrir menú de acciones"
                    >
                      ⋮
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 px-4 py-3 bg-neutral-50/60 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-sm text-neutral-600">
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}

      {menuState && renderActions && (
        <div
          className="fixed bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50"
          style={{ top: menuState.y, left: menuState.x }}
        >
          {renderActions(menuState.row).map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onClick();
                setMenuState(null);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${
                action.danger ? 'text-danger hover:bg-danger/5' : 'text-neutral-700'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DataTable;
