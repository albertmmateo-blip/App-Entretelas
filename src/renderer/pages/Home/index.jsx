import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable';

const MODULE_LABELS = { notas: 'N', llamar: 'LL', encargar: 'EN' };
const MODULE_NAMES = { notas: 'Notas', llamar: 'Llamar', encargar: 'Encargar' };

const NAV_ITEMS = [
  { path: '/urgente', icon: '⚠️', label: 'URGENTE!' },
  { path: '/notas', icon: '📝', label: 'Notas' },
  { path: '/llamar', icon: '📞', label: 'Llamar' },
  { path: '/encargar', icon: '📦', label: 'Encargar' },
  { path: '/contabilidad', icon: '📄', label: 'Contabilidad' },
  { path: '/email', icon: '📧', label: 'E-mail' },
];

const COLUMNS = [
  {
    key: 'type',
    label: 'Tipo',
    sortable: true,
    render: (value) => (
      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-neutral-100 text-neutral-700">
        {MODULE_LABELS[value] ?? value}
      </span>
    ),
  },
  {
    key: 'urgente',
    label: 'URGENT.',
    sortable: false,
    render: (value) =>
      value ? (
        <span className="inline-block w-3 h-3 rounded-full bg-danger" title="Urgente" />
      ) : null,
  },
  {
    key: 'title',
    label: 'Título / Asunto',
    sortable: true,
    sortValue: (row) => row.title ?? '',
  },
  {
    key: 'contacto',
    label: 'Contacto',
    sortable: true,
    sortValue: (row) => row.contacto ?? '',
    render: (value) => value ?? <span className="text-neutral-400">—</span>,
  },
  {
    key: 'fecha_creacion',
    label: 'Fecha',
    sortable: true,
    sortValue: (row) => row.fecha_creacion ?? '',
    render: (value) =>
      value ? (
        new Date(value).toLocaleDateString('es-ES')
      ) : (
        <span className="text-neutral-400">—</span>
      ),
  },
];

function transformEntries(notasData, llamarData, encargarData) {
  const notas = (notasData?.data ?? []).map((n) => ({
    id: n.id,
    type: 'notas',
    title: n.nombre ?? null,
    contacto: n.contacto ?? null,
    descripcion: n.descripcion ?? null,
    urgente: Boolean(n.urgente),
    fecha_creacion: n.fecha_creacion ?? null,
    fecha_mod: n.fecha_mod ?? null,
  }));

  const llamar = (llamarData?.data ?? []).map((l) => ({
    id: l.id,
    type: 'llamar',
    title: l.asunto ?? null,
    contacto: l.contacto ?? null,
    descripcion: l.descripcion ?? null,
    urgente: Boolean(l.urgente),
    fecha_creacion: l.fecha_creacion ?? null,
    fecha_mod: l.fecha_mod ?? null,
  }));

  const encargar = (encargarData?.data ?? []).map((e) => ({
    id: e.id,
    type: 'encargar',
    title: e.articulo ?? null,
    contacto: e.proveedor ?? null,
    descripcion: e.descripcion ?? null,
    urgente: Boolean(e.urgente),
    fecha_creacion: e.fecha_creacion ?? null,
    fecha_mod: e.fecha_mod ?? null,
  }));

  return [...notas, ...llamar, ...encargar];
}

function matchesDateFilter(entry, dateFilter) {
  if (dateFilter === 'all') return true;
  if (!entry.fecha_creacion) return false;
  const entryDate = new Date(entry.fecha_creacion);
  const now = new Date();
  const diffMs = now - entryDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (dateFilter === '7d') return diffDays <= 7;
  if (dateFilter === '30d') return diffDays <= 30;
  return true;
}

function Home() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [urgenteFilter, setUrgenteFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const [notasRes, llamarRes, encargarRes] = await Promise.all([
          window.electronAPI.notas.getAll(),
          window.electronAPI.llamar.getAll(),
          window.electronAPI.encargar.getAll(),
        ]);
        if (!cancelled) {
          setEntries(transformEntries(notasRes, llamarRes, encargarRes));
        }
      } catch {
        // If electronAPI is unavailable (e.g. tests) just leave entries empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return entries.filter((e) => {
      if (moduleFilter !== 'all' && e.type !== moduleFilter) return false;
      if (urgenteFilter === 'urgent' && !e.urgente) return false;
      if (urgenteFilter === 'non-urgent' && e.urgente) return false;
      if (!matchesDateFilter(e, dateFilter)) return false;
      if (query) {
        const inTitle = e.title && e.title.toLowerCase().includes(query);
        const inContacto = e.contacto && e.contacto.toLowerCase().includes(query);
        const inDescripcion = e.descripcion && e.descripcion.toLowerCase().includes(query);
        if (!inTitle && !inContacto && !inDescripcion) return false;
      }
      return true;
    });
  }, [entries, searchQuery, moduleFilter, urgenteFilter, dateFilter]);

  return (
    <div className="p-6">
      {/* Page heading */}
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Home</h1>

      {/* Module quick-nav panel */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
        {NAV_ITEMS.map(({ path, icon, label }) => (
          <Link
            key={path}
            to={path}
            className="flex flex-col items-center justify-center w-[120px] h-[120px] bg-neutral-100 border border-neutral-200 rounded-xl shadow-sm hover:shadow-md hover:border-primary transition-all text-neutral-700 hover:text-primary"
          >
            <span className="text-4xl mb-2">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="search"
          placeholder="🔍 Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-search-input
          className="flex-1 min-w-[200px] px-4 py-2 bg-neutral-100 border border-neutral-200 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
        />

        {/* Filter panel */}
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          aria-label="Filtrar por módulo"
          className="px-3 py-2 border border-neutral-200 rounded text-sm text-neutral-700 focus:ring-2 focus:ring-primary"
        >
          <option value="all">Todos los módulos</option>
          {Object.entries(MODULE_NAMES).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={urgenteFilter}
          onChange={(e) => setUrgenteFilter(e.target.value)}
          aria-label="Filtrar por urgencia"
          className="px-3 py-2 border border-neutral-200 rounded text-sm text-neutral-700 focus:ring-2 focus:ring-primary"
        >
          <option value="all">Todos</option>
          <option value="urgent">Solo urgentes</option>
          <option value="non-urgent">No urgentes</option>
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          aria-label="Filtrar por fecha"
          className="px-3 py-2 border border-neutral-200 rounded text-sm text-neutral-700 focus:ring-2 focus:ring-primary"
        >
          <option value="all">Todo el tiempo</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>
      </div>

      {/* Entry count */}
      {!loading && (
        <p className="text-xs text-neutral-400 mb-2">
          {filteredEntries.length} entrada{filteredEntries.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Table */}
      {loading && <div className="text-sm text-neutral-500 py-8 text-center">Cargando...</div>}
      {!loading && filteredEntries.length === 0 && (
        <div className="flex flex-col items-center py-16 text-neutral-400">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-lg font-medium">
            {searchQuery ||
            moduleFilter !== 'all' ||
            urgenteFilter !== 'all' ||
            dateFilter !== 'all'
              ? 'No hay entradas que coincidan con los filtros'
              : 'No hay entradas'}
          </p>
        </div>
      )}
      {!loading && filteredEntries.length > 0 && (
        <DataTable
          columns={COLUMNS}
          data={filteredEntries}
          onRowClick={(row) => navigate(`/${row.type}/${row.id}`)}
          initialSort={{ key: 'fecha_creacion', direction: 'desc' }}
          rowClassName={(row) => (row.urgente ? 'bg-danger/5' : '')}
        />
      )}
    </div>
  );
}

export default Home;
