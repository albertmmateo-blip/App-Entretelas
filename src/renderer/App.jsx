import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Urgente from './pages/Urgente';
import Notas from './pages/Notas';
import Llamar from './pages/Llamar';
import Encargar from './pages/Encargar';
import Facturas from './pages/Facturas';
import Email from './pages/Email';

export function AppLayout() {
  const navLinks = [
    { path: '/urgente', label: 'URGENTE!', icon: '⚠️' },
    { path: '/notas', label: 'Notas', icon: '📝' },
    { path: '/llamar', label: 'Llamar', icon: '📞' },
    { path: '/encargar', label: 'Encargar', icon: '📦' },
    { path: '/facturas', label: 'Facturas', icon: '📄' },
    { path: '/email', label: 'E-mail', icon: '📧' },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-[72px] bg-white border-r border-neutral-200 flex flex-col py-4">
        {navLinks.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-3 px-2 text-xs hover:bg-neutral-50 transition-colors ${
                isActive ? 'text-primary' : 'text-neutral-700'
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
          <Route path="/notas/nueva" element={<Notas />} />
          <Route path="/notas/:id" element={<Notas />} />
          <Route path="/llamar" element={<Llamar />} />
          <Route path="/llamar/nueva" element={<Llamar />} />
          <Route path="/llamar/:id" element={<Llamar />} />
          <Route path="/encargar" element={<Encargar />} />
          <Route path="/encargar/nueva" element={<Encargar />} />
          <Route path="/encargar/:id" element={<Encargar />} />
          <Route path="/facturas" element={<Facturas />} />
          <Route path="/facturas/compra" element={<Facturas />} />
          <Route path="/facturas/compra/:proveedorId" element={<Facturas />} />
          <Route path="/facturas/venta" element={<Facturas />} />
          <Route path="/facturas/venta/:clienteId" element={<Facturas />} />
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
