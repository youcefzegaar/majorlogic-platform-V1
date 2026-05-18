import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0d0d1a', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif',
          padding: '32px', textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <h1 style={{ color: '#fff', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#9ca3af', marginBottom: 24, maxWidth: 480 }}>
            MajorLogic encountered an unexpected error. Please refresh the page to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#7C3AED', color: '#fff', border: 'none',
              padding: '12px 28px', borderRadius: 8, fontSize: 15,
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            Refresh page
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: 32, padding: 16, background: 'rgba(255,0,0,0.08)',
              border: '1px solid rgba(255,0,0,0.2)', borderRadius: 8,
              fontSize: 12, color: '#f87171', textAlign: 'left',
              maxWidth: 700, overflowX: 'auto'
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
