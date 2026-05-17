import React from 'react';

const STEPS = ['Goal', 'Analysis', 'Cards', 'Explanation', 'Summary'];

export default function ProgressBar({ phase, onStepClick }) {
  return (
    <div className="progress-bar">
      {STEPS.map((step, idx) => (
        <React.Fragment key={step}>
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
