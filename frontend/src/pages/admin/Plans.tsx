import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Plan = {
  id: string;
  name: string;
  price: number;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  max_users: number | null;
  active: boolean;
  description: string | null;
};

const initialForm = {
  name: '',
  price: '',
  billing_cycle: 'monthly',
  max_users: '',
  description: '',
};

const presets = [
  { name: 'Essencial', price: 0, billing_cycle: 'monthly', max_users: 1, description: '1 admin • Dashboard • Agenda • Clientes • Serviços' },
  { name: 'Profissional', price: 0, billing_cycle: 'monthly', max_users: 3, description: '1 admin • 1 recepcionista • 1 profissional • módulos internos completos' },
  { name: 'Premium', price: 0, billing_cycle: 'monthly', max_users: 999, description: 'Usuários ilimitados • WhatsApp • Google Agenda • IA' },
];

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<any>(initialForm);
  const [loading, setLoading] = useState(false);

  async function loadPlans() {
    const { data, error } = await supabase.from('subscription_plans').select('*').order('name');
    if (error) return alert(error.message);
    setPlans(data || []);
  }

  async function createPlan(payloadOverride?: any) {
    const payload = payloadOverride || form;
    if (!payload.name?.trim()) return alert('Informe o nome do plano');
    try {
      setLoading(true);
      const { error } = await supabase.from('subscription_plans').insert([{ name: payload.name.trim(), price: Number(payload.price || 0), billing_cycle: payload.billing_cycle, max_users: payload.max_users ? Number(payload.max_users) : null, description: payload.description?.trim() || null, active: true }]);
      if (error) throw error;
      if (!payloadOverride) setForm(initialForm);
      await loadPlans();
    } catch (error: any) {
      alert(error.message || 'Erro ao cadastrar plano');
    } finally {
      setLoading(false);
    }
  }

  async function createPresets() {
    for (const preset of presets) {
      const exists = plans.some((p) => p.name.toLowerCase() === preset.name.toLowerCase());
      if (!exists) await createPlan(preset);
    }
    alert('Planos padrão processados.');
  }

  async function togglePlanStatus(plan: Plan) {
    const { error } = await supabase.from('subscription_plans').update({ active: !plan.active }).eq('id', plan.id);
    if (error) return alert(error.message);
    loadPlans();
  }

  useEffect(() => { loadPlans(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Planos</h1>
          <p className="text-sm text-stone-600">Cadastre e gerencie os planos de assinatura do sistema.</p>
        </div>
        <button onClick={createPresets} className="bg-stone-900 text-white px-4 py-2 rounded-lg">Criar planos padrão</button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold">Novo plano</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border border-stone-300 rounded-lg px-4 py-3" placeholder="Nome do plano" value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} />
          <input className="border border-stone-300 rounded-lg px-4 py-3" placeholder="Valor" type="number" step="0.01" value={form.price} onChange={(e) => setForm((prev: any) => ({ ...prev, price: e.target.value }))} />
          <select className="border border-stone-300 rounded-lg px-4 py-3" value={form.billing_cycle} onChange={(e) => setForm((prev: any) => ({ ...prev, billing_cycle: e.target.value }))}>
            <option value="monthly">Mensal</option>
            <option value="quarterly">Trimestral</option>
            <option value="yearly">Anual</option>
          </select>
          <input className="border border-stone-300 rounded-lg px-4 py-3" placeholder="Máximo de usuários" type="number" value={form.max_users} onChange={(e) => setForm((prev: any) => ({ ...prev, max_users: e.target.value }))} />
        </div>
        <textarea className="border border-stone-300 rounded-lg px-4 py-3 w-full min-h-[110px]" placeholder="Descrição do plano" value={form.description} onChange={(e) => setForm((prev: any) => ({ ...prev, description: e.target.value }))} />
        <button onClick={() => createPlan()} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-lg font-medium disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar plano'}</button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-200"><h2 className="text-lg font-semibold">Planos cadastrados</h2></div>
        <div className="divide-y divide-stone-200">
          {plans.length === 0 && <div className="p-6 text-sm text-stone-500">Nenhum plano cadastrado.</div>}
          {plans.map((plan) => (
            <div key={plan.id} className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-stone-900">{plan.name}</h3>
                <p className="text-sm text-stone-600">R$ {Number(plan.price).toFixed(2)} • {plan.billing_cycle === 'monthly' ? 'Mensal' : plan.billing_cycle === 'quarterly' ? 'Trimestral' : 'Anual'}</p>
                <p className="text-sm text-stone-500">Máx. usuários: {plan.max_users ?? 'Ilimitado'}</p>
                {plan.description && <p className="text-sm text-stone-500 mt-1">{plan.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${plan.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{plan.active ? 'Ativo' : 'Inativo'}</span>
                <button onClick={() => togglePlanStatus(plan)} className="px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50">{plan.active ? 'Desativar' : 'Ativar'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
