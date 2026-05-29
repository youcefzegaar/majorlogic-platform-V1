import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

export default function AuthModal() {
  const { t } = useTranslation();
  const {
    showAuthModal,
    authModalMode,
    authError,
    setShowAuthModal,
    setAuthModalMode,
    setAuthError,
    login,
    register,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef(null);

  // Reset form when modal mode changes or modal closes
  useEffect(() => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setAuthError(null);
    setIsSubmitting(false);
  }, [authModalMode, showAuthModal, setAuthError]);

  // Focus-trap: move focus into dialog on open, restore on close
  useEffect(() => {
    if (!showAuthModal) return;
    const prev = document.activeElement;
    const firstFocusable = dialogRef.current?.querySelector(FOCUSABLE);
    firstFocusable?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { setShowAuthModal(false); return; }
      if (e.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) || [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      prev?.focus();
    };
  }, [showAuthModal, setShowAuthModal]);

  if (!showAuthModal) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowAuthModal(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (authModalMode === 'login') {
      await login({ email, password });
    } else {
      await register({ email, password, displayName });
    }
    setIsSubmitting(false);
  };

  const switchMode = () => {
    setAuthModalMode(authModalMode === 'login' ? 'register' : 'login');
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 420,
          position: 'relative',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        ref={dialogRef}
      >
        {/* Close button */}
        <button
          onClick={() => setShowAuthModal(false)}
          aria-label={t('auth.close')}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>

        {/* Title */}
        <h2
          id="auth-modal-title"
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: 4,
            marginTop: 0,
          }}
        >
          {authModalMode === 'login' ? t('auth.login_title') : t('auth.register_title')}
        </h2>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, marginTop: 16 }}>
          {['login', 'register'].map((mode) => (
            <button
              key={mode}
              onClick={() => setAuthModalMode(mode)}
              style={{
                flex: 1,
                padding: '8px 0',
                background: authModalMode === mode ? 'var(--accent)' : 'transparent',
                color: authModalMode === mode ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: mode === 'login' ? '8px 0 0 8px' : '0 8px 8px 0',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {mode === 'login' ? t('auth.login_title') : t('auth.register_title')}
            </button>
          ))}
        </div>

        {/* Error */}
        {authError && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.3)',
              borderRadius: 8,
              color: 'var(--accent-danger)',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {authError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('auth.email_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          {authModalMode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{t('auth.display_name_label')}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t('auth.password_label')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={authModalMode === 'login' ? 'current-password' : 'new-password'}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '11px 0',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {isSubmitting
              ? '...'
              : authModalMode === 'login'
              ? t('auth.submit_login')
              : t('auth.submit_register')}
          </button>
        </form>

        {/* Switch mode link */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={switchMode}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {authModalMode === 'login'
              ? t('auth.switch_to_register')
              : t('auth.switch_to_login')}
          </button>
        </div>
      </div>
    </div>
  );
}
