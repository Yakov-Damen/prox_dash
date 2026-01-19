'use client';

import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="bg-slate-900 border border-red-500/20 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl shadow-red-500/5">
        <div className="bg-red-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="text-red-500 w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-white">Something went wrong!</h2>
        <p className="text-slate-400 mb-6 text-sm">{error instanceof Error ? error.message : String(error)}</p>
        <button
          onClick={resetErrorBoundary}
          className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
        >
          <RefreshCw size={18} />
          Try Again
        </button>
      </div>
    </div>
  );
}

export function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      {children}
    </ErrorBoundary>
  );
}
