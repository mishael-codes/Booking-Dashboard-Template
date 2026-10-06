import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Suppress logging PII or sensitive stack frames
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-neutral-900 p-4">
          <div className="w-full max-w-md bg-white rounded-lg border border-neutral-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Application Error</h2>
              <p className="mt-1 text-xs text-neutral-600">
                An unexpected interface error occurred. You can reload the application safely.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-2 px-4 rounded bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
