import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MajorSelector from './MajorSelector';
import BudgetSelector from './BudgetSelector';

const SESSION_KEY = 'mlp_intake_answers';

function ChipGroup({ options, value, onChange, multi = false }) {
  const isSelected = (v) => multi ? (value || []).includes(v) : value === v;
  const toggle = (v) => {
    if (!multi) { onChange(v); return; }
    const cur = value || [];
    onChange(isSelected(v) ? cur.filter(x => x !== v) : [...cur, v]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(({ value: v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => toggle(v)}
          style={{
            padding: '7px 14px',
            borderRadius: 20,
            fontSize: 13,
            cursor: 'pointer',
            border: isSelected(v)
              ? '1px solid var(--accent-info)'
              : '1px solid var(--border)',
            background: isSelected(v)
              ? 'rgba(14,165,233,0.12)'
              : 'rgba(255,255,255,0.03)',
            color: isSelected(v) ? 'var(--accent-info)' : 'var(--text-secondary)',
            fontWeight: isSelected(v) ? 600 : 400,
            transition: 'all 0.15s ease',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function IntakePhase({
  goal, setGoal,
  major, setMajor,
  priorities, setPriorities,
  budgetMin, setBudgetMin,
  budgetMax, setBudgetMax,
  isAnalyzing, onAnalyze,
  onAnswersChange,
}) {
  const { t } = useTranslation();

  const [answers, setAnswers] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : { primaryUseCase: null, carriesDaily: null, hoursAwayFromCharger: null, usageScenarios: [] };
    } catch { return { primaryUseCase: null, carriesDaily: null, hoursAwayFromCharger: null, usageScenarios: [] }; }
  });

  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(answers)); } catch {}
    onAnswersChange?.(answers);

    // Auto-derive priorities from answers — removes duplication with sliders
    const batteryPriority =
      answers.hoursAwayFromCharger === 9 ? 85 :
      answers.hoursAwayFromCharger === 6 ? 62 :
      answers.hoursAwayFromCharger === 4 ? 35 : 55;

    const portabilityPriority =
      answers.carriesDaily === true  ? 80 :
      answers.carriesDaily === false ? 30 : 50;

    const scenarios = answers.usageScenarios || [];
    const perfBase =
      answers.primaryUseCase === 'coding'  ? 80 :
      answers.primaryUseCase === 'design'  ? 75 :
      answers.primaryUseCase === 'study'   ? 55 :
      answers.primaryUseCase === 'general' ? 50 : 65;
    const perfBoost = scenarios.some(s => ['vms','design','gaming'].includes(s)) ? 15 : 0;
    const performancePriority = Math.min(100, perfBase + perfBoost);

    setPriorities?.(prev => ({
      ...prev,
      battery:     batteryPriority,
      portability: portabilityPriority,
      performance: performancePriority,
    }));
  }, [answers]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));

  const handleSaveDraft = () => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(answers)); } catch {}
    // Draft is already in sessionStorage — nothing more to persist without auth
    const msg = t('intake.draft_saved', 'Draft saved for this session.');
    alert(msg);
  };

  const useCaseOptions = [
    { value: 'coding', label: t('intake.usecase_coding', 'Coding & Dev') },
    { value: 'design', label: t('intake.usecase_design', 'Design & Creative') },
    { value: 'study', label: t('intake.usecase_study', 'Study & Research') },
    { value: 'general', label: t('intake.usecase_general', 'General Work') },
  ];

  const mobilityOptions = [
    { value: 'daily', label: t('intake.mobility_daily', 'Yes, daily') },
    { value: 'sometimes', label: t('intake.mobility_sometimes', 'Sometimes') },
    { value: 'rarely', label: t('intake.mobility_rarely', 'Rarely — mostly desk') },
  ];

  const batteryOptions = [
    { value: 4, label: t('intake.battery_lt4', 'Under 4 hours') },
    { value: 6, label: t('intake.battery_4to7', '4–7 hours') },
    { value: 9, label: t('intake.battery_full', 'Full day or more') },
  ];

  const workloadOptions = [
    { value: 'vms', label: t('intake.workload_vms', 'VMs / Docker') },
    { value: 'design', label: t('intake.workload_design', 'Adobe / Design') },
    { value: 'gaming', label: t('intake.workload_gaming', 'Gaming') },
    { value: 'none', label: t('intake.workload_none', 'None of these') },
  ];

  return (
    <div className="phase-container active">
      <div className="intake-grid">
        {/* Free text */}
        <div className="intake-card full-width">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(233,69,96,0.15)', color: 'var(--accent)' }}>🎯</div>
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
          />
        </div>

        {/* 4 life questions */}
        <div className="intake-card full-width" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Q1 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
              {t('intake.q1_label', 'What will you use it most for?')}
            </div>
            <ChipGroup
              options={useCaseOptions}
              value={answers.primaryUseCase}
              onChange={v => update('primaryUseCase', v)}
            />
          </div>

          {/* Q2 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
              {t('intake.q2_label', 'Will you carry it often outside home or office?')}
            </div>
            <ChipGroup
              options={mobilityOptions}
              value={answers.carriesDaily}
              onChange={v => update('carriesDaily', v === 'daily')}
            />
          </div>

          {/* Q3 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
              {t('intake.q3_label', 'How many hours are you usually away from a charger?')}
            </div>
            <ChipGroup
              options={batteryOptions}
              value={answers.hoursAwayFromCharger}
              onChange={v => update('hoursAwayFromCharger', v)}
            />
          </div>

          {/* Q4 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
              {t('intake.q4_label', 'Do you run any of the following?')}
            </div>
            <ChipGroup
              options={workloadOptions}
              value={answers.usageScenarios}
              onChange={v => update('usageScenarios', v)}
              multi
            />
          </div>
        </div>

        <MajorSelector major={major} setMajor={setMajor} />
        <BudgetSelector budgetMin={budgetMin} setBudgetMin={setBudgetMin} budgetMax={budgetMax} setBudgetMax={setBudgetMax} />
      </div>

      {/* Privacy notice */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 14px',
        background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.18)',
        borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>ℹ️</span>
        <span>
          <strong style={{ color: 'var(--text-primary)' }}>{t('intake.how_we_work')}</strong>{' '}
          {t('intake.affiliate_body')}{' '}
          <button
            style={{ background: 'none', border: 'none', color: 'var(--accent-info)', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}
            onClick={() => window.open('/how-we-work', '_blank')}
          >
            {t('intake.how_we_guarantee')}
          </button>
        </span>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={onAnalyze} disabled={isAnalyzing}>
          <i className="fas fa-brain"></i>{' '}
          {isAnalyzing ? t('buttons.analyzing') : t('buttons.analyze')}
        </button>
        <button className="btn btn-secondary" onClick={handleSaveDraft}>
          <i className="fas fa-save"></i> {t('intake.save_draft')}
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
