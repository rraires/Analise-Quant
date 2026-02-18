import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                    <h3>Algo deu errado com este componente.</h3>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
