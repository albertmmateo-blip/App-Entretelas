import React from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Urgente from './pages/Urgente';
import Notas from './pages/Notas';
import Llamar from './pages/Llamar';
import Encargar from './pages/Encargar';
import Contabilidad from './pages/Facturas';
import Email from './pages/Email';

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
        {navLinks.map(({ path, label, icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `mx-2 mb-1 rounded-md flex flex-col items-center justify-center py-3 px-2 text-xs transition-colors ${
                isActive
                  ? 'text-primary text-white bg-white/20 font-medium'
                  : 'text-white/90 hover:bg-white/15 hover:text-white'
              }`
            }
          >
            <span className="text-2xl mb-1">{icon}</span>
            <span className="text-center leading-tight">{label}</span>
          </NavLink>
        ))}
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
          <Route path="/contabilidad" element={<Contabilidad />} />
          <Route path="/contabilidad/compra" element={<Contabilidad />} />
          <Route path="/contabilidad/compra/:proveedorId" element={<Contabilidad />} />
          <Route path="/contabilidad/compra/:proveedorId/editar" element={<Contabilidad />} />
          <Route path="/contabilidad/venta" element={<Contabilidad />} />
          <Route path="/contabilidad/venta/:clienteId" element={<Contabilidad />} />
          <Route path="/contabilidad/venta/:clienteId/editar" element={<Contabilidad />} />
          <Route path="/contabilidad/arreglos" element={<Contabilidad />} />
          <Route path="/contabilidad/arreglos/:proveedorId" element={<Contabilidad />} />
          <Route path="/contabilidad/arreglos/:proveedorId/editar" element={<Contabilidad />} />

          <Route path="/facturas" element={<Contabilidad />} />
          <Route path="/facturas/compra" element={<Contabilidad />} />
          <Route path="/facturas/compra/:proveedorId" element={<Contabilidad />} />
          <Route path="/facturas/compra/:proveedorId/editar" element={<Contabilidad />} />
          <Route path="/facturas/venta" element={<Contabilidad />} />
          <Route path="/facturas/venta/:clienteId" element={<Contabilidad />} />
          <Route path="/facturas/venta/:clienteId/editar" element={<Contabilidad />} />
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
