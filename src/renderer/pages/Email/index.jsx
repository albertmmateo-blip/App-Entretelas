import React, { useCallback, useEffect, useRef, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';

function isAllowedGoogleUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    return parsed.hostname === 'mail.google.com' || parsed.hostname.endsWith('.google.com');
  } catch {
    return false;
  }
}

function isSafeExternalProtocol(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function Email() {
  const webviewRef = useRef(null);
  const [pendingExternalUrl, setPendingExternalUrl] = useState(null);

  const maybeConfirmExternalUrl = useCallback((url, event) => {
    if (!url || isAllowedGoogleUrl(url)) {
      return;
    }

    event.preventDefault();
    setPendingExternalUrl(url);
  }, []);

  useEffect(() => {
    const webview = webviewRef.current;

    if (!webview || typeof webview.addEventListener !== 'function') {
      return undefined;
    }

    const handleWillNavigate = (event) => {
      maybeConfirmExternalUrl(event.url, event);
    };

    const handleNewWindow = (event) => {
      maybeConfirmExternalUrl(event.url, event);
    };

    webview.addEventListener('will-navigate', handleWillNavigate);
    webview.addEventListener('new-window', handleNewWindow);

    return () => {
      webview.removeEventListener('will-navigate', handleWillNavigate);
      webview.removeEventListener('new-window', handleNewWindow);
    };
  }, [maybeConfirmExternalUrl]);

  const handleOpenExternal = useCallback(async () => {
    if (!pendingExternalUrl) {
      return;
    }

    const urlToOpen = pendingExternalUrl;
    setPendingExternalUrl(null);

    if (!isSafeExternalProtocol(urlToOpen)) {
      return;
    }

    await window.electronAPI?.system?.openExternal?.(urlToOpen);
  }, [pendingExternalUrl]);

  return (
    <div className="h-full w-full">
      <webview
        ref={webviewRef}
        src="https://mail.google.com"
        partition="persist:gmail"
        allowpopups="false"
        disablewebsecurity="false"
        nodeintegration="false"
        style={{ width: '100%', height: '100%' }}
      />

      {pendingExternalUrl && (
        <ConfirmDialog
          title="Abrir enlace externo en navegador?"
          message={pendingExternalUrl}
          onConfirm={handleOpenExternal}
          onCancel={() => setPendingExternalUrl(null)}
          confirmText="Abrir"
        />
      )}
    </div>
  );
}

export default Email;
