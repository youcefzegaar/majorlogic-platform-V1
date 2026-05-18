import { create } from 'zustand';

export const useDecisionStore = create((set) => ({
  phase: 0,
  selectedCardType: 'hero',
  explanationTab: 'why-chosen',
  selectedPurchase: 'amazon',

  setPhase: (phase) => set({ phase }),
  setSelectedCardType: (selectedCardType) => set({ selectedCardType }),
  setExplanationTab: (explanationTab) => set({ explanationTab }),
  setSelectedPurchase: (selectedPurchase) => set({ selectedPurchase }),
}));
