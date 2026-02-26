import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import useNavCounts from './hooks/useNavCounts';
import useToast from './hooks/useToast';
import ConfirmDialog from './components/ConfirmDialog';
import ExportProgressDialog from './components/ExportProgressDialog';
import incognitoUrl from './assets/incognito.svg';
import Home from './pages/Home';
import Urgente from './pages/Urgente';
import Notas from './pages/Notas';
import Llamar from './pages/Llamar';
import Encargar from './pages/Encargar';
import Email from './pages/Email';
import Secret from './pages/Secret';
import Guardado from './pages/Guardado';

import iconUrl from './assets/icon.svg';

const Contabilidad = lazy(() => import('./pages/Facturas'));

function ContabilidadRoute() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: '16px',
            fontFamily: 'Tahoma,sans-serif',
            fontSize: '13px',
            color: '#9d8577',
          }}
        >
          Cargando módulo...
        </div>
      }
    >
      <Contabilidad />
    </Suspense>
  );
}

function TitleBar({ onIconClick, isSecret }) {
  const [maximized, setMaximized] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [importExportBusy, setImportExportBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(null); // { phase, processedBytes, totalBytes }
  const helpMenuRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    window.electronAPI?.window
      ?.isMaximized()
      .then(setMaximized)
      .catch(() => {});
    window.electronAPI?.window?.onMaximizeChange?.(setMaximized);
  }, []);

  // Listen for export progress from main process
  useEffect(() => {
    const cleanup = window.electronAPI?.data?.onExportProgress?.((data) => {
      if (data.phase === 'done') {
        setExportProgress(null);
      } else {
        setExportProgress(data);
      }
    });
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  // Close help menu when clicking outside
  useEffect(() => {
    if (!helpMenuOpen) return undefined;
    function handleClick(e) {
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target)) {
        setHelpMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [helpMenuOpen]);

  const handleExport = useCallback(async () => {
    setHelpMenuOpen(false);
    setImportExportBusy(true);
    try {
      const result = await window.electronAPI?.data?.export();
      if (result?.success) {
        showToast('Datos exportados correctamente', 'success');
      } else if (!result?.cancelled) {
        showToast(result?.error?.message || 'Error al exportar', 'error');
      }
    } catch (err) {
      showToast('Error al exportar datos', 'error');
    } finally {
      setImportExportBusy(false);
      setExportProgress(null);
    }
  }, [showToast]);

  const handleImportConfirmed = useCallback(async () => {
    setConfirmImport(false);
    setImportExportBusy(true);
    try {
      const result = await window.electronAPI?.data?.import();
      if (result?.success) {
        showToast('Datos importados correctamente', 'success');
      } else if (!result?.cancelled) {
        showToast(result?.error?.message || 'Error al importar', 'error');
      }
    } catch (err) {
      showToast('Error al importar datos', 'error');
    } finally {
      setImportExportBusy(false);
    }
  }, [showToast]);

  return (
    <>
      <div className="xp-titlebar">
        <button
          type="button"
          className="xp-titlebar-icon-btn"
          onClick={onIconClick}
          aria-label="Acceso especial"
        >
          <img src={iconUrl} alt="" className="xp-titlebar-icon" />
        </button>
        <span className="xp-titlebar-text">Entretelas</span>
        {isSecret && (
          <img
            src={incognitoUrl}
            alt="Módulo secreto"
            style={{
              width: '22px',
              height: '22px',
              marginLeft: '4px',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
              flexShrink: 0,
            }}
          />
        )}
        <div className="xp-titlebar-controls">
          {/* Help button */}
          <div ref={helpMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="xp-title-btn"
              onClick={() => setHelpMenuOpen((prev) => !prev)}
              aria-label="Ayuda"
              aria-expanded={helpMenuOpen}
              disabled={importExportBusy}
            >
              ?
            </button>

            {helpMenuOpen && (
              <div className="xp-help-menu">
                <button
                  type="button"
                  className="xp-help-menu-item"
                  onClick={handleExport}
                  disabled={importExportBusy}
                >
                  <span className="xp-help-menu-icon">📤</span>
                  Exportar datos
                </button>
                <button
                  type="button"
                  className="xp-help-menu-item"
                  onClick={() => {
                    setHelpMenuOpen(false);
                    setConfirmImport(true);
                  }}
                  disabled={importExportBusy}
                >
                  <span className="xp-help-menu-icon">📥</span>
                  Importar datos
                </button>
                <div className="xp-help-menu-divider" />
                <button type="button" className="xp-help-menu-item" disabled>
                  <span className="xp-help-menu-icon">❓</span>
                  Ayuda
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="xp-title-btn"
            onClick={() => window.electronAPI?.window?.minimize()}
            aria-label="Minimizar"
          >
            ─
          </button>
          <button
            type="button"
            className="xp-title-btn"
            onClick={() => {
              window.electronAPI?.window?.maximize();
            }}
            aria-label={maximized ? 'Restaurar' : 'Maximizar'}
          >
            {maximized ? '⧇' : '□'}
          </button>
          <button
            type="button"
            className="xp-title-btn close"
            onClick={() => window.electronAPI?.window?.close()}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {confirmImport && (
        <ConfirmDialog
          title="Importar datos"
          message="Esto reemplazará TODOS los datos actuales con los del archivo importado. Se creará una copia de seguridad automática antes de continuar. ¿Deseas continuar?"
          confirmText="Importar"
          confirmDanger
          onConfirm={handleImportConfirmed}
          onCancel={() => setConfirmImport(false)}
        />
      )}

      {exportProgress && <ExportProgressDialog progress={exportProgress} />}
    </>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSecretPromptOpen, setIsSecretPromptOpen] = useState(false);
  const [secretPassword, setSecretPassword] = useState('');
  const secretInputRef = useRef(null);
  const navCounts = useNavCounts();
  const isSecret = location.pathname.startsWith('/mixo');

  useEffect(() => {
    if (isSecretPromptOpen && secretInputRef.current) {
      secretInputRef.current.focus();
    }
  }, [isSecretPromptOpen]);

  const navLinks = [
    { path: '/', label: 'Home', icon: '🏠', end: true },
    { path: '/urgente', label: 'URGENTE!', icon: '⚠️', urgent: true, countKey: 'urgente' },
    { path: '/notas', label: 'Notas', icon: '📝', countKey: 'notas' },
    { path: '/llamar', label: 'Llamar', icon: '📞', countKey: 'llamar' },
    { path: '/encargar', label: 'Encargar', icon: '📦', countKey: 'encargar' },
    { path: '/contabilidad', label: 'Contabilidad', icon: '📄' },
    { path: '/guardado', label: 'Guardado', icon: '📍' },
  ];

  return (
    <div className="xp-window">
      {/* XP Title Bar */}
      <TitleBar
        onIconClick={() => {
          setSecretPassword('');
          setIsSecretPromptOpen(true);
        }}
        isSecret={isSecret}
      />

      {/* XP Navigation Tab Bar */}
      <nav className="xp-navbar">
        {navLinks.map(({ path, label, icon, end, urgent, countKey }) => {
          const count = countKey ? navCounts[countKey] : 0;
          return (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `xp-nav-tab${urgent ? ' urgente-tab' : ''}${isActive ? ' active-tab' : ''}`
              }
            >
              <span className="tab-icon">{icon}</span>
              <span>{label}</span>
              {count > 0 && (
                <span className={`xp-nav-badge${urgent ? ' xp-nav-badge--urgent' : ''}`}>
                  {count}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Spacer pushes Email to the far right */}
        <div style={{ flex: 1 }} />

        <NavLink
          to="/email"
          className={({ isActive }) => `xp-nav-tab${isActive ? ' active-tab' : ''}`}
        >
          <span className="tab-icon">📧</span>
          <span>E-mail</span>
        </NavLink>
      </nav>

      {/* Content area */}
      <main className="xp-workspace">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/urgente" element={<Urgente />} />
          <Route path="/notas" element={<Notas />} />
          <Route path="/notas/:id" element={<Notas />} />
          <Route path="/llamar" element={<Llamar />} />
          <Route path="/llamar/:id" element={<Llamar />} />
          <Route path="/encargar" element={<Encargar />} />
          <Route path="/encargar/catalogo" element={<Encargar />} />
          <Route path="/encargar/catalogo/nueva" element={<Encargar />} />
          <Route path="/encargar/catalogo/proveedor/nueva" element={<Encargar />} />
          <Route path="/encargar/catalogo/familia/nueva" element={<Encargar />} />
          <Route path="/encargar/catalogo/producto/nueva" element={<Encargar />} />
          <Route path="/encargar/catalogo/producto/:entryId/editar" element={<Encargar />} />
          <Route path="/encargar/catalogo/:folderId" element={<Encargar />} />
          <Route path="/encargar/catalogo/:folderId/nueva" element={<Encargar />} />
          <Route path="/encargar/catalogo/:folderId/editar" element={<Encargar />} />
          <Route path="/encargar/catalogo/:folderId/producto/nueva" element={<Encargar />} />
          <Route path="/encargar/catalogo/:folderId/entrada/nueva" element={<Encargar />} />
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
          <Route path="/contabilidad/arreglos/carpeta/:albaran" element={<ContabilidadRoute />} />
          <Route path="/contabilidad/arreglos/nueva" element={<ContabilidadRoute />} />
          <Route
            path="/contabilidad/arreglos/carpeta/:albaran/nueva"
            element={<ContabilidadRoute />}
          />
          <Route path="/contabilidad/arreglos/:id" element={<ContabilidadRoute />} />
          <Route
            path="/contabilidad/arreglos/carpeta/:albaran/:id"
            element={<ContabilidadRoute />}
          />
          <Route
            path="/contabilidad/arreglos/resumenes-mensuales"
            element={<ContabilidadRoute />}
          />

          <Route path="/facturas" element={<ContabilidadRoute />} />
          <Route path="/facturas/compra" element={<ContabilidadRoute />} />
          <Route path="/facturas/compra/:proveedorId" element={<ContabilidadRoute />} />
          <Route path="/facturas/compra/:proveedorId/editar" element={<ContabilidadRoute />} />
          <Route path="/facturas/venta" element={<ContabilidadRoute />} />
          <Route path="/facturas/venta/:clienteId" element={<ContabilidadRoute />} />
          <Route path="/facturas/venta/:clienteId/editar" element={<ContabilidadRoute />} />
          <Route path="/email" element={<Email />} />
          <Route path="/guardado" element={<Guardado />} />
          <Route path="/mixo" element={<Secret />} />
          <Route path="/mixo/catalogo" element={<Secret />} />
          <Route path="/mixo/catalogo/nueva" element={<Secret />} />
          <Route path="/mixo/catalogo/proveedor/nueva" element={<Secret />} />
          <Route path="/mixo/catalogo/familia/nueva" element={<Secret />} />
          <Route path="/mixo/catalogo/producto/nueva" element={<Secret />} />
          <Route path="/mixo/catalogo/producto/:entryId/editar" element={<Secret />} />
          <Route path="/mixo/catalogo/:folderId" element={<Secret />} />
          <Route path="/mixo/catalogo/:folderId/nueva" element={<Secret />} />
          <Route path="/mixo/catalogo/:folderId/editar" element={<Secret />} />
          <Route path="/mixo/catalogo/:folderId/producto/nueva" element={<Secret />} />
          <Route path="/mixo/catalogo/:folderId/entrada/nueva" element={<Secret />} />
        </Routes>
      </main>

      {isSecretPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/45">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              setSecretPassword('');
              setIsSecretPromptOpen(false);
            }}
            aria-label="Cerrar acceso secreto"
          />
          <form
            className="relative z-10 w-[560px] max-w-[88vw]"
            onSubmit={(event) => {
              event.preventDefault();

              if (secretPassword === 'mixo') {
                setSecretPassword('');
                setIsSecretPromptOpen(false);
                navigate('/mixo');
                return;
              }

              setSecretPassword('');
              setIsSecretPromptOpen(false);
            }}
          >
            <input
              ref={secretInputRef}
              type="password"
              value={secretPassword}
              onChange={(event) => setSecretPassword(event.target.value)}
              className="h-16 w-full border border-success-200 bg-neutral-900 px-5 font-mono text-lg tracking-wider text-success-100 outline-none"
            />
          </form>
        </div>
      )}
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
