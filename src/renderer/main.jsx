import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './utils/promise-try-polyfill';
import './utils/pdfjs-setup';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
