import { useTranslation } from 'react-i18next';
import MajorSelector from './MajorSelector';
import BudgetSelector from './BudgetSelector';
import PreferenceSliders from './PreferenceSliders';
import Icon from '../shared/Icon';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAppContext } from '../../contexts/AppContext';

export default function IntakePhase() {
  const { profile, engine, handleAnalyze } = useAppContext();
  const { goal, setGoal, major, setMajor, priorities, setPriorities, budgetMin, setBudgetMin, budgetMax, setBudgetMax } = profile;
  const isAnalyzing = engine.isAnalyzing;
  const onAnalyze = handleAnalyze;

  const { t } = useTranslation();
  const [, setDraft] = useLocalStorage('ml_draft_v1', null);
  const saveDraft = () => setDraft({ goal, major, priorities, budgetMin, budgetMax });

  return (
    <div className="phase-container active">
      <div className="intake-grid">
        <div className="intake-card full-width">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(233, 69, 96, 0.15)', color: 'var(--accent)' }}>🎯</div>
            <div>
              <div className="card-title">{t('intake.goal_title')}</div>
              <div className="card-subtitle">{t('intake.goal_subtitle')}</div>
            </div>
          </div>
          <textarea
            className="form-input"
            rows="3"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={t('intake.goal_placeholder')}
          ></textarea>
          <p style={{ fontSize: '12px', color: 'var(--text-muted, #6b7280)', margin: '4px 0 0' }}>
            {t('intake.goal_scope_note')}
          </p>
        </div>
        <MajorSelector major={major} setMajor={setMajor} />
        <PreferenceSliders priorities={priorities} setPriorities={setPriorities} />
        <BudgetSelector budgetMin={budgetMin} setBudgetMin={setBudgetMin} budgetMax={budgetMax} setBudgetMax={setBudgetMax} />
      </div>

      {/* Affiliate Disclosure */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '10px 14px',
          background: 'rgba(14, 165, 233, 0.05)',
          border: '1px solid rgba(14, 165, 233, 0.18)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}
      >
        <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>ℹ️</span>
        <span>
          <strong style={{ color: 'var(--text-primary)' }}>{t('intake.how_we_work')}</strong>{' '}
          {t('intake.affiliate_body')}{' '}
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-info)',
              cursor: 'pointer',
              fontSize: 12,
              padding: 0,
              textDecoration: 'underline',
            }}
            onClick={() => window.open('/disclosure', '_blank')}
          >
            {t('intake.how_we_guarantee')}
          </button>
        </span>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={onAnalyze} disabled={isAnalyzing}>
          <Icon name="brain" />{' '}
          {isAnalyzing ? t('buttons.analyzing') : t('buttons.analyze')}
        </button>
        <button className="btn btn-secondary" onClick={saveDraft}>
          <Icon name="save" /> {t('intake.save_draft')}
        </button>
      </div>

      {isAnalyzing && (
        <div className="thinking-state">
          <div className="thinking-dots">
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
          </div>
          <span style={{ color: 'var(--text-secondary)' }}>{t('intake.analyzing_conflicts')}</span>
        </div>
      )}
    </div>
  );
}
