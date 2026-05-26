import React from 'react';
import { useTranslation } from 'react-i18next';

export default function ProgressBar({ phase, onStepClick }) {
  const { t } = useTranslation();
  const STEPS = [
    t('progress.goal'),
    t('progress.analysis'),
    t('progress.cards'),
    t('progress.explanation'),
    t('progress.ownership'),
    t('progress.summary'),
  ];

  return (
    <div className="progress-bar">
      {STEPS.map((step, idx) => (
        <React.Fragment key={idx}>
          <div
            className={`step ${phase === idx ? 'active' : phase > idx ? 'completed' : 'pending'}`}
            onClick={() => onStepClick(idx)}
          >
            <span className="step-number">{idx + 1}</span>
            <span>{step}</span>
          </div>
          {idx < STEPS.length - 1 && <div className={`step-connector ${phase > idx ? 'completed' : ''}`}></div>}
        </React.Fragment>
      ))}
    </div>
  );
}
