import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

const apiUrl = import.meta.env.VITE_API_URL || 'https://majorlogicapi-production.up.railway.app';

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function MyDecisions({ onLoad, onClose }) {
  const { t } = useTranslation();
  const { user, setShowAuthModal, setAuthModalMode } = useAuthStore();

  const [decisions, setDecisions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    setFetchError(null);
    fetch(`${apiUrl}/user/decisions`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load decisions');
        const data = await res.json();
        setDecisions(Array.isArray(data) ? data : data.decisions ?? []);
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    const csrf = getCsrfToken();
    try {
      const res = await fetch(`${apiUrl}/user/decisions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrf },
      });
      if (res.ok) {
        setDecisions((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      // best-effort
    } finally {
      setDeletingId(null);
    }
  };

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  };

  const panelStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '0 0 0 16px',
    width: '100%',
    maxWidth: 480,
    height: '100%',
    overflowY: 'auto',
    padding: '24px 20px',
    boxSizing: 'border-box',
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) onClose();
  };

  return (
    <div style={overlayStyle} onClick={handleBackdropClick}>
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {t('nav.my_decisions')}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 22,
                cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        {!user && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              Sign in to view your saved decisions.
            </div>
            <button
              className="btn btn-primary"
              onClick={() => { setAuthModalMode('login'); setShowAuthModal(true); }}
            >
              Sign In
            </button>
          </div>
        )}

        {user && isLoading && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
            Loading...
          </div>
        )}

        {user && !isLoading && fetchError && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(244,63,94,0.1)',
            border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: 8,
            color: 'var(--accent-danger)',
            fontSize: 13,
          }}>
            {fetchError}
          </div>
        )}

        {user && !isLoading && !fetchError && decisions.length === 0 && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
            No saved decisions yet.
          </div>
        )}

        {user && !isLoading && decisions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {decisions.map((d) => {
              const shortHash = d.irHash ? d.irHash.slice(0, 10) : null;
              const dateStr = d.created_at
                ? new Date(d.created_at).toLocaleDateString()
                : null;
              return (
                <div
                  key={d.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {d.title || 'Untitled Decision'}
                      </div>
                      {d.domain && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                          {d.domain}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {dateStr && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dateStr}</span>
                        )}
                        {shortHash && (
                          <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                            {shortHash}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {onLoad && (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: '5px 12px' }}
                          onClick={() => { onLoad(d); if (onClose) onClose(); }}
                        >
                          Load
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        style={{
                          fontSize: 12,
                          padding: '5px 12px',
                          opacity: deletingId === d.id ? 0.5 : 1,
                          color: 'var(--accent-danger)',
                          borderColor: 'var(--accent-danger)',
                        }}
                        disabled={deletingId === d.id}
                        onClick={() => handleDelete(d.id)}
                      >
                        {deletingId === d.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
