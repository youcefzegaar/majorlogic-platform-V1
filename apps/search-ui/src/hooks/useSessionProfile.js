import { useState } from 'react';

export function useSessionProfile() {
  const [goal, setGoal] = useState('');
  const [major, setMajor] = useState('cs');
  const [priorities, setPriorities] = useState({
    performance: 90,
    battery: 60,
    portability: 50,
    build: 30
  });
  const [budgetMin, setBudgetMin] = useState(1200);
  const [budgetMax, setBudgetMax] = useState(2500);

  const resetPriorities = () => {
    setPriorities({
      performance: 90,
      battery: 60,
      portability: 50,
      build: 30
    });
    setBudgetMax(2500);
  };

  return {
    goal, setGoal,
    major, setMajor,
    priorities, setPriorities,
    budgetMin, setBudgetMin,
    budgetMax, setBudgetMax,
    resetPriorities
  };
}
