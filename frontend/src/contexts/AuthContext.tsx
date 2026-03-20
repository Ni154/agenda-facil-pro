import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, CompanyUser, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  companyUser: CompanyUser | null;
  role: UserRole | null;
  loading: boolean;
  accessBlocked: boolean;
  accessBlockedReason: string | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companyUser, setCompanyUser] = useState<CompanyUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [accessBlockedReason, setAccessBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        clearAuthState();
        setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        clearAuthState();
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function clearAuthState() {
    setProfile(null);
    setCompanyUser(null);
    setRole(null);
    setAccessBlocked(false);
    setAccessBlockedReason(null);
  }

  async function loadUserData(userId: string) {
    setLoading(true);

    try {
      clearAuthState();

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        setAccessBlocked(true);
        setAccessBlockedReason('Seu perfil não foi encontrado. Solicite liberação ao administrador.');
        return;
      }

      setProfile(profileData);

      // Admin global entra mesmo sem vínculo com empresa
      if (profileData.is_global_admin) {
        setRole('superadmin');
        setAccessBlocked(false);
        setAccessBlockedReason(null);
        return;
      }

      // Usuário comum precisa estar vinculado a uma empresa ativa
      const { data: cuData, error: cuError } = await supabase
        .from('company_users')
        .select('*')
        .eq('profile_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (cuError) {
        console.error('Error loading company user:', cuError);
        setAccessBlocked(true);
        setAccessBlockedReason('Não foi possível validar seu vínculo com a empresa.');
        return;
      }

      if (!cuData) {
        setAccessBlocked(true);
        setAccessBlockedReason('Seu usuário não está vinculado a nenhuma empresa ativa.');
        return;
      }

      setCompanyUser(cuData);

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, status')
        .eq('id', cuData.company_id)
        .maybeSingle();

      if (companyError || !companyData) {
        console.error('Error loading company:', companyError);
        setAccessBlocked(true);
        setAccessBlockedReason('A empresa vinculada ao seu usuário não foi encontrada.');
        return;
      }

      if (companyData.status !== 'active') {
        setAccessBlocked(true);
        setAccessBlockedReason('A empresa está inativa ou suspensa. Fale com o administrador.');
        return;
      }

      setRole(cuData.role);
      setAccessBlocked(false);
      setAccessBlockedReason(null);
    } catch (error) {
      console.error('Error loading user data:', error);
      setAccessBlocked(true);
      setAccessBlockedReason('Erro ao validar seu acesso. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const refreshAuth = async () => {
    if (!user?.id) return;
    await loadUserData(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthState();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        companyUser,
        role,
        loading,
        accessBlocked,
        accessBlockedReason,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
