import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectiveCompany } from '../../hooks/useEffectiveCompany';
import { useCompanyContext } from '../../contexts/CompanyContext';

type ListedUser = {
  profile_id: string;
  role: string;
  status: string;
  profile?: { full_name?: string | null; email?: string | null } | null;
};

export default function Users() {
  const { role: authRole } = useAuth();
  const companyId = useEffectiveCompany();
  const { plan } = useCompanyContext();
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('12345678');
  const [role, setRole] = useState('receptionist');
  const [loading, setLoading] = useState(false);

  const roleCounts = useMemo(() => ({
    admin: users.filter((u) => u.role === 'admin' && u.status === 'active').length,
    receptionist: users.filter((u) => u.role === 'receptionist' && u.status === 'active').length,
    professional: users.filter((u) => u.role === 'professional' && u.status === 'active').length,
  }), [users]);

  const canManage = authRole === 'admin' || authRole === 'superadmin';

  async function loadUsers() {
    if (!companyId) return;
    const { data, error } = await supabase
      .from('company_users')
      .select('profile_id, role, status, profile:profiles(full_name,email)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) return alert(error.message);
    setUsers((data || []) as any);
  }

  useEffect(() => {
    if (companyId) loadUsers();
  }, [companyId]);

  function validateLimit(nextRole: string) {
    if (authRole === 'superadmin') return true;
    if (nextRole === 'admin' && roleCounts.admin >= plan.maxAdmins) return false;
    if (nextRole === 'receptionist' && roleCounts.receptionist >= plan.maxReceptionists) return false;
    if (nextRole === 'professional' && roleCounts.professional >= plan.maxProfessionals) return false;
    return true;
  }

  async function createUser() {
    if (!canManage) return alert('Sem permissão para gerenciar usuários.');
    if (!companyId) return alert('Selecione uma empresa para continuar.');
    if (!email || !fullName || !password) return alert('Preencha nome, e-mail e senha.');
    if (!validateLimit(role)) return alert(`O plano ${plan.name} não permite mais usuários com o perfil ${role}.`);

    try {
      setLoading(true);
      const response = await fetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, company_id: companyId, role }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao criar usuário');
      alert('Usuário criado com sucesso.');
      setEmail(''); setFullName(''); setPassword('12345678'); setRole('receptionist');
      await loadUsers();
    } catch (error: any) {
      alert(error.message || 'Erro ao criar usuário.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(userId: string, status: string) {
    if (!canManage || !companyId) return;
    const { error } = await supabase
      .from('company_users')
      .update({ status: status === 'active' ? 'inactive' : 'active' })
      .eq('profile_id', userId)
      .eq('company_id', companyId);
    if (error) return alert(error.message);
    await loadUsers();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários da empresa</h1>
        <p className="text-sm text-stone-600">Plano atual: <strong>{plan.name}</strong>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border bg-white">Admins: {roleCounts.admin}/{plan.maxAdmins >= 999 ? '∞' : plan.maxAdmins}</div>
        <div className="p-4 rounded-xl border bg-white">Recepção: {roleCounts.receptionist}/{plan.maxReceptionists >= 999 ? '∞' : plan.maxReceptionists}</div>
        <div className="p-4 rounded-xl border bg-white">Profissionais: {roleCounts.professional}/{plan.maxProfessionals >= 999 ? '∞' : plan.maxProfessionals}</div>
      </div>

      {canManage && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">Novo usuário</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Nome completo" className="border p-3 rounded-lg" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <input placeholder="E-mail" className="border p-3 rounded-lg" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input placeholder="Senha inicial" className="border p-3 rounded-lg" value={password} onChange={(e) => setPassword(e.target.value)} />
            <select className="border p-3 rounded-lg" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="receptionist">Recepcionista</option>
              <option value="professional">Profissional</option>
            </select>
          </div>
          <button onClick={createUser} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-lg">{loading ? 'Criando...' : 'Criar usuário'}</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="divide-y">
          {users.map((user) => (
            <div key={user.profile_id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{user.profile?.full_name || 'Usuário'}</div>
                <div className="text-sm text-stone-500">{user.profile?.email || 'sem e-mail'} • {user.role}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-700'}`}>{user.status}</span>
                {canManage && <button onClick={() => toggleStatus(user.profile_id, user.status)} className="border rounded-lg px-3 py-2">{user.status === 'active' ? 'Desativar' : 'Ativar'}</button>}
              </div>
            </div>
          ))}
          {users.length === 0 && <div className="p-6 text-sm text-stone-500">Nenhum usuário cadastrado.</div>}
        </div>
      </div>
    </div>
  );
}
