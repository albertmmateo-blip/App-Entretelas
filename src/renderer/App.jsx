import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Urgente from './pages/Urgente';
import Notas from './pages/Notas';
import Llamar from './pages/Llamar';
import Encargar from './pages/Encargar';
import Email from './pages/Email';

const Contabilidad = lazy(() => import('./pages/Facturas'));

function ContabilidadRoute() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-neutral-600">Cargando módulo...</div>}>
      <Contabilidad />
    </Suspense>
  );
}

export function AppLayout() {
  const navLinks = [
    { path: '/', label: 'Home', icon: '🏠', end: true },
    { path: '/urgente', label: 'URGENTE!', icon: '⚠️' },
    { path: '/notas', label: 'Notas', icon: '📝' },
    { path: '/llamar', label: 'Llamar', icon: '📞' },
    { path: '/encargar', label: 'Encargar', icon: '📦' },
    { path: '/contabilidad', label: 'Contabilidad', icon: '📄' },
    { path: '/email', label: 'E-mail', icon: '📧' },
  ];

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-700">
      {/* Sidebar */}
      <nav className="w-[78px] bg-primary border-r border-primary-700/25 flex flex-col py-4 shadow-sm">
        {navLinks.map(({ path, label, icon, end }) => {
          const isUrgentLink = path === '/urgente';

          return (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) => {
                let stateClasses = '';

                if (isActive) {
                  stateClasses = isUrgentLink
                    ? 'border-danger-200/70 bg-danger-100 text-danger-700 font-semibold'
                    : 'border-transparent text-primary text-white bg-white/20 font-medium';
                } else {
                  stateClasses = isUrgentLink
                    ? 'border-transparent text-white hover:bg-danger-700/25 hover:border-danger-200/40 hover:text-white'
                    : 'border-transparent text-white/90 hover:bg-white/15 hover:text-white';
                }

                return `mx-2 mb-1 rounded-md border flex flex-col items-center justify-center py-3 px-2 text-xs transition-colors ${stateClasses}`;
              }}
            >
              <span className={`text-2xl mb-1 ${isUrgentLink ? 'drop-shadow-sm' : ''}`}>
                {icon}
              </span>
              <span
                className={`text-center leading-tight ${isUrgentLink ? 'font-semibold tracking-wide' : ''}`}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Content area */}
      <main className="flex-1 overflow-auto bg-neutral-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/urgente" element={<Urgente />} />
          <Route path="/notas" element={<Notas />} />
          <Route path="/notas/:id" element={<Notas />} />
          <Route path="/llamar" element={<Llamar />} />
          <Route path="/llamar/:id" element={<Llamar />} />
          <Route path="/encargar" element={<Encargar />} />
          <Route path="/encargar/nueva" element={<Encargar />} />
          <Route path="/encargar/:id" element={<Encargar />} />
          <Route path="/encargar/proveedor/nuevo" element={<Encargar />} />
          <Route path="/encargar/proveedor/:proveedorId" element={<Encargar />} />
          <Route path="/encargar/proveedor/:proveedorId/editar" element={<Encargar />} />
          <Route path="/contabilidad" element={<ContabilidadRoute />} />
          <Route path="/contabilidad/compra" element={<ContabilidadRoute />} />
          <Route path="/contabilidad/compra/:proveedorId" element={<ContabilidadRoute />} />
          <Route path="/contabilidad/compra/:proveedorId/editar" element={<ContabilidadRoute />} />
          <Route path="/contabilidad/venta" element={<ContabilidadRoute />} />
          <Route path="/contabilidad/venta/:clienteId" element={<ContabilidadRoute />} />
          <Route path="/contabilidad/venta/:clienteId/editar" element={<ContabilidadRoute />} />
          <Route path="/contabilidad/arreglos" element={<ContabilidadRoute />} />
          <Route path="/contabilidad/arreglos/nueva" element={<ContabilidadRoute />} />
          <Route path="/contabilidad/arreglos/:id" element={<ContabilidadRoute />} />

          <Route path="/facturas" element={<ContabilidadRoute />} />
          <Route path="/facturas/compra" element={<ContabilidadRoute />} />
          <Route path="/facturas/compra/:proveedorId" element={<ContabilidadRoute />} />
          <Route path="/facturas/compra/:proveedorId/editar" element={<ContabilidadRoute />} />
          <Route path="/facturas/venta" element={<ContabilidadRoute />} />
          <Route path="/facturas/venta/:clienteId" element={<ContabilidadRoute />} />
          <Route path="/facturas/venta/:clienteId/editar" element={<ContabilidadRoute />} />
          <Route path="/email" element={<Email />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}

export default App;
