import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

try {
  registerSW({
    immediate: true,
    onRegisterError() {
      // Ignore service worker registration errors on restricted hosts
    },
  });
} catch {
  // Ignore SW initialization errors
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<{children: React.ReactNode}, ErrorBoundaryState> {
  state: ErrorBoundaryState = {hasError: false, errorMessage: ''};

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Unexpected application error',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-lg text-center space-y-4">
            <h1 className="text-lg font-extrabold text-slate-900">
              Master Dry Clean AI
            </h1>
            <p className="text-xs text-slate-600">
              ਐਪ ਲੋਡ ਕਰਨ ਵਿੱਚ ਕੋਈ ਸਮੱਸਿਆ ਆਈ: {this.state.errorMessage}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                ਦੁਬਾਰਾ ਲੋਡ ਕਰੋ (Reload)
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('mdc_billing_draft');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                ਡਰਾਫਟ ਸਾਫ਼ ਕਰਕੇ ਖੋਲ੍ਹੋ
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
