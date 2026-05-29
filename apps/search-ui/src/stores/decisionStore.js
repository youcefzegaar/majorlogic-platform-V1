import { create } from 'zustand';

export const useDecisionStore = create((set) => ({
  phase: 0,
  selectedCardType: 'hero',
  explanationTab: 'decision',
  cameFromExplanation: false,
  decisionRunId: null,

  setPhase: (phase) => set({ phase }),
  setSelectedCardType: (selectedCardType) => set({ selectedCardType }),
  setExplanationTab: (explanationTab) => set({ explanationTab }),
  setCameFromExplanation: (cameFromExplanation) => set({ cameFromExplanation }),
  setDecisionRunId: (decisionRunId) => set({ decisionRunId }),
}));
