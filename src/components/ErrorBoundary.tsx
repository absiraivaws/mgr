import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MGR ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-10 my-4 rounded-3xl bg-white border border-rose-200 shadow-sm text-center max-w-lg mx-auto space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {this.props.fallbackTitle || 'Booking View Encountered a Display Issue'}
            </h3>
            <p className="text-xs text-slate-500">
              We encountered a temporary formatting issue loading this booking view. Your data is safe.
            </p>
          </div>
          {this.state.error?.message && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left font-mono text-[11px] text-slate-700 break-words max-h-24 overflow-y-auto">
              {this.state.error.message}
            </div>
          )}
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry / Return to Search</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
