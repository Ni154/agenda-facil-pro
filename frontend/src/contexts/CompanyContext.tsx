import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type ScopedCompany = {
  id: string;
  name: string;
  status?: string | null;
};

type PlanCode = 'ESSENCIAL' | 'PROFISSIONAL' | 'PREMIUM';

type CompanyPlan = {
  code: PlanCode;
  name: string;
  maxAdmins: number;
  maxReceptionists: number;
  maxProfessionals: number;
  modules: {
    dashboard: boolean;
    agenda: boolean;
    clients: boolean;
    services: boolean;
    sales: boolean;
    finance: boolean;
    users: boolean;
    whatsapp: boolean;
    googleCalendar: boolean;
    ai: boolean;
  };
};

const PLAN_PRESETS: Record<PlanCode, CompanyPlan> = {
  ESSENCIAL: {
    code: 'ESSENCIAL',
    name: 'Essencial',
    maxAdmins: 1,
    maxReceptionists: 0,
    maxProfessionals: 0,
    modules: { dashboard: true, agenda: true, clients: true, services: true, sales: false, finance: false, users: false, whatsapp: false, googleCalendar: false, ai: false },
  },
  PROFISSIONAL: {
    code: 'PROFISSIONAL',
    name: 'Profissional',
    maxAdmins: 1,
    maxReceptionists: 1,
    maxProfessionals: 1,
    modules: { dashboard: true, agenda: true, clients: true, services: true, sales: true, finance: true, users: true, whatsapp: false, googleCalendar: false, ai: false },
  },
  PREMIUM: {
    code: 'PREMIUM',
    name: 'Premium',
    maxAdmins: 999,
    maxReceptionists: 999,
    maxProfessionals: 999,
    modules: { dashboard: true, agenda: true, clients: true, services: true, sales: true, finance: true, users: true, whatsapp: true, googleCalendar: true, ai: true },
  },
};

interface CompanyContextValue {
  activeCompanyId: string | null;
  setActiveCompanyId: (companyId: string | null) => void;
  companies: ScopedCompany[];
  loadingCompanies: boolean;
  plan: CompanyPlan;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

function normalizePlan(name?: string | null): CompanyPlan {
  const raw = (name || '').trim().toUpperCase();
  if (raw.includes('PREMIUM')) return PLAN_PRESETS.PREMIUM;
  if (raw.includes('PROFISSIONAL')) return PLAN_PRESETS.PROFISSIONAL;
  if (raw.includes('ESSENCIAL')) return PLAN_PRESETS.ESSENCIAL;
  if (raw.includes('PLANO 1') || raw.includes('ASSINATURA 1')) return PLAN_PRESETS.ESSENCIAL;
  if (raw.includes('PLANO 2') || raw.includes('ASSINATURA 2')) return PLAN_PRESETS.PROFISSIONAL;
  if (raw.includes('PLANO 3') || raw.includes('ASSINATURA 3')) return PLAN_PRESETS.PREMIUM;
  return PLAN_PRESETS.PREMIUM;
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { role, companyUser, user } = useAuth();
  const [companies, setCompanies] = useState<ScopedCompany[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [plan, setPlan] = useState<CompanyPlan>(PLAN_PRESETS.PREMIUM);

  const storageKey = useMemo(() => `active-company:${user?.id || 'anonymous'}`, [user?.id]);

  const setActiveCompanyId = (companyId: string | null) => {
    setActiveCompanyIdState(companyId);
    if (companyId) localStorage.setItem(storageKey, companyId);
    else localStorage.removeItem(storageKey);
  };

  const refreshCompanies = async () => {
    if (!user) {
      setCompanies([]);
      setActiveCompanyId(null);
      return;
    }

    if (role === 'superadmin') {
      try {
        setLoadingCompanies(true);
        const { data } = await supabase.from('companies').select('id,name,status').order('name');
        const companyRows = (data || []) as ScopedCompany[];
        setCompanies(companyRows);

        const stored = localStorage.getItem(storageKey);
        const fallback = stored && companyRows.some(c => c.id === stored) ? stored : companyRows[0]?.id || null;
        setActiveCompanyIdState(fallback);
      } finally {
        setLoadingCompanies(false);
      }
    } else if (companyUser?.company_id) {
      const { data } = await supabase.from('companies').select('id,name,status').eq('id', companyUser.company_id).maybeSingle();
      const one = data ? [data as ScopedCompany] : [];
      setCompanies(one);
      setActiveCompanyIdState(companyUser.company_id);
    } else {
      setCompanies([]);
      setActiveCompanyIdState(null);
    }
  };

  useEffect(() => {
    refreshCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, companyUser?.company_id, user?.id]);

  useEffect(() => {
    const loadPlan = async () => {
      if (!activeCompanyId) {
        setPlan(role === 'superadmin' ? PLAN_PRESETS.PREMIUM : PLAN_PRESETS.ESSENCIAL);
        return;
      }

      const { data } = await supabase
        .from('company_subscriptions')
        .select('subscription_plans(name)')
        .eq('company_id', activeCompanyId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      const planName = (data as any)?.subscription_plans?.name || null;
      setPlan(normalizePlan(planName));
    };
    loadPlan();
  }, [activeCompanyId, role]);

  return (
    <CompanyContext.Provider value={{ activeCompanyId, setActiveCompanyId, companies, loadingCompanies, plan, refreshCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompanyContext must be used within CompanyProvider');
  return ctx;
}
