import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompanyContext } from '../contexts/CompanyContext';

export function useEffectiveCompany() {
  const { companyUser, role } = useAuth();
  const { activeCompanyId } = useCompanyContext();

  const companyId = useMemo(() => {
    if (role === 'superadmin') return activeCompanyId;
    return companyUser?.company_id || activeCompanyId || null;
  }, [role, companyUser?.company_id, activeCompanyId]);

  return companyId;
}
