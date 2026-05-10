import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Domain Management API
 */
export const DomainAPI = {
  async getActiveDomains() {
    const { data, error } = await supabase
      .from('cognitive_domains')
      .select('id, slug, title, version, is_active, updated_at')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching domains:', error);
      return [];
    }
    return data;
  },

  async createDomain(domainData) {
    const { data, error } = await supabase
      .from('cognitive_domains')
      .insert([domainData])
      .select();
      
    if (error) throw error;
    return data;
  },

  async updateDomainConfig(id, config) {
    const { data, error } = await supabase
      .from('cognitive_domains')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
      
    if (error) throw error;
    return data;
  }
};

/**
 * Telemetry API
 */
export const TelemetryAPI = {
  async getDashboardMetrics() {
    const { data, error } = await supabase
      .from('cognitive_telemetry')
      .select('confidence_score, integrity_score, recovery_activated, created_at')
      .order('created_at', { ascending: false })
      .limit(1000); // Sample last 1000 decisions
      
    if (error) {
      console.error('Error fetching telemetry:', error);
      return { total: 0, avgConfidence: 0, avgIntegrity: 0, recoveries: 0 };
    }

    if (!data || data.length === 0) {
       return { total: 0, avgConfidence: 0, avgIntegrity: 0, recoveries: 0 };
    }

    const total = data.length;
    const avgConfidence = data.reduce((acc, curr) => acc + (curr.confidence_score || 0), 0) / total;
    const avgIntegrity = data.reduce((acc, curr) => acc + (curr.integrity_score || 0), 0) / total;
    const recoveries = data.filter(d => d.recovery_activated).length;

    return {
      total,
      avgConfidence: Math.round(avgConfidence),
      avgIntegrity: Math.round(avgIntegrity),
      recoveries
    };
  },
  
  async getRecentInterventions() {
    const { data, error } = await supabase
      .from('cognitive_telemetry')
      .select('intent_slug, relaxed_constraint, integrity_score, created_at')
      .eq('recovery_activated', true)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) return [];
    return data;
  }
};

/**
 * Affiliate Management API
 */
export const AffiliateAPI = {
  async getSettings() {
    const { data, error } = await supabase
      .from('affiliate_settings')
      .select('*')
      .order('seller', { ascending: true });
    
    if (error) {
      console.error('Error fetching affiliate settings:', error);
      return [];
    }
    return data;
  },

  async saveTag(tagData) {
    const { data, error } = await supabase
      .from('affiliate_settings')
      .upsert(tagData);
    
    if (error) throw error;
    return data;
  }
};

/**
 * Growth & Leads API
 */
export const LeadsAPI = {
  async getLeads() {
    const { data, error } = await supabase
      .from('growth_leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching leads:', error);
      return [];
    }
    return data;
  }
};

