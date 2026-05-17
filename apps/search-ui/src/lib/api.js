import { createClient } from '@supabase/supabase-js';

// These would normally come from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const DomainAPI = {
  async getDomains() {
    const { data, error } = await supabase
      .from('cognitive_domains')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};

export const DecisionAPI = {
  async search(domainId, query, profile) {
    // In a real app, this would call our DecisionOrchestrator via a Lambda or Edge Function
    // For the demo, we simulate the logic behavior based on the domain config
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          decisionRunId: crypto.randomUUID(), // stub — should eventually call real API
          intent: {
            title: "Dynamic Decision Path",
            confidence: 88,
            interpretation: `Analyzing your request for domain: ${domainId}. Context: ${JSON.stringify(profile)}`
          },
          results: [] // This would be populated by the Orchestrator
        });
      }, 1000);
    });
  }
};
