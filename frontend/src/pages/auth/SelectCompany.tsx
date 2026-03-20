import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, LogOut, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function SelectCompany() {
  const { user, profile, signOut, refreshAuth } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [companyName, setCompanyName] = useState('NS Sistema');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !companyName.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{ name: companyName.trim() }])
        .select()
        .single();

      if (companyError) throw companyError;

      // 2. Create company_user link as superadmin
      const { error: linkError } = await supabase
        .from('company_users')
        .insert([{
          company_id: company.id,
          profile_id: user.id,
          role: 'superadmin',
          status: 'active'
        }]);

      if (linkError) throw linkError;

      // 3. Refresh auth and go to dashboard
      await refreshAuth();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error creating company:', err);
      setError(err.message || 'Erro ao criar empresa.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200">
            <Building2 className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Bem-vindo!</h1>
          <p className="mt-2 text-stone-500">Para começar, você precisa estar vinculado a uma empresa.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-200 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100">
              {error}
            </div>
          )}

          {!isCreating ? (
            <div className="space-y-4">
              <button
                onClick={() => setIsCreating(true)}
                className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <Plus size={20} />
                  <span>Criar Nova Empresa</span>
                </div>
                <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </button>
              
              <p className="text-xs text-center text-stone-400 px-4">
                Se você foi convidado para uma empresa, entre em contato com o administrador para ativar seu acesso.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wider">Nome da Empresa</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Minha Clínica"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 px-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 px-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          )}

          <div className="pt-6 border-t border-stone-100">
            <button
              onClick={signOut}
              className="w-full py-3 px-4 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all"
            >
              <LogOut size={18} />
              Sair da Conta
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-stone-400">
            Logado como <span className="font-bold text-stone-500">{profile?.full_name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
