import { useLocalStorage } from './useLocalStorage';

const DEFAULT_PROFILE = {
  goal: '',
  major: 'cs',
  priorities: { performance: 90, battery: 60, portability: 50, build: 30 },
  budgetMin: 1200,
  budgetMax: 2500
};

export function useSessionProfile() {
  const [rawProfile, setProfile] = useLocalStorage('ml_session_v1', DEFAULT_PROFILE);
  // Merge stored data with DEFAULT_PROFILE to handle old/missing fields (e.g. after a revert)
  const profile = {
    ...DEFAULT_PROFILE,
    ...rawProfile,
    priorities: { ...DEFAULT_PROFILE.priorities, ...(rawProfile?.priorities ?? {}) }
  };

  const setGoal = (goal) => setProfile(prev => ({ ...prev, goal }));
  const setMajor = (major) => setProfile(prev => ({ ...prev, major }));
  const setPriorities = (priorities) => setProfile(prev => ({ ...prev, priorities }));
  const setBudgetMin = (budgetMin) => setProfile(prev => ({ ...prev, budgetMin }));
  const setBudgetMax = (budgetMax) => setProfile(prev => ({ ...prev, budgetMax }));

  const resetPriorities = () => setProfile(prev => ({
    ...prev,
    priorities: DEFAULT_PROFILE.priorities,
    budgetMax: DEFAULT_PROFILE.budgetMax
  }));

  return {
    goal: profile.goal, setGoal,
    major: profile.major, setMajor,
    priorities: profile.priorities, setPriorities,
    budgetMin: profile.budgetMin, setBudgetMin,
    budgetMax: profile.budgetMax, setBudgetMax,
    resetPriorities
  };
}
