import React, { Component, ErrorInfo, ReactNode } from 'react';
import { OperationalError } from './OperationalUI';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] ${(this as any).props.moduleName || 'Module'} crash:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (this as any).props.fallback || (
        <div className="p-8">
          <OperationalError 
            message={`The ${(this as any).props.moduleName || 'operational module'} encountered a critical rendering failure.`} 
            onRetry={() => (this as any).setState({ hasError: false })}
          />
        </div>
      );
    }

    return (this as any).props.children;
  }
}
