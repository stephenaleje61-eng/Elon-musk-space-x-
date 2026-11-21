import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected application error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ELON MUSK SPACE Runtime ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-950/70 border border-rose-800 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold mb-2">ELON MUSK SPACE — Recovery Mode</h1>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              The interface encountered an unexpected rendering error. Click below to restore normal operation.
            </p>
            <div className="p-3 mb-6 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-rose-300 break-words text-left">
              {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Website</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
