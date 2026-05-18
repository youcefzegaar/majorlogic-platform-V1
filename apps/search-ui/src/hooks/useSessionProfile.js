import { useLocalStorage } from './useLocalStorage';

const DEFAULT_PROFILE = {
  goal: '',
  major: 'cs',
  priorities: { performance: 90, battery: 60, portability: 50, build: 30 },
  budgetMin: 1200,
  budgetMax: 2500
};

export function useSessionProfile() {
  const [profile, setProfile] = useLocalStorage('ml_session_v1', DEFAULT_PROFILE);

  const setGoal = (goal) => setProfile({ ...profile, goal });
  const setMajor = (major) => setProfile({ ...profile, major });
  const setPriorities = (priorities) => setProfile({ ...profile, priorities });
  const setBudgetMin = (budgetMin) => setProfile({ ...profile, budgetMin });
  const setBudgetMax = (budgetMax) => setProfile({ ...profile, budgetMax });

  const resetPriorities = () => setProfile({
    ...profile,
    priorities: DEFAULT_PROFILE.priorities,
    budgetMax: DEFAULT_PROFILE.budgetMax
  });

  return {
    goal: profile.goal, setGoal,
    major: profile.major, setMajor,
    priorities: profile.priorities, setPriorities,
    budgetMin: profile.budgetMin, setBudgetMin,
    budgetMax: profile.budgetMax, setBudgetMax,
    resetPriorities
  };
}
