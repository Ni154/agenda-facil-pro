import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Company = {
  id: string;
  name: string;
  status: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
};

type SubscriptionRow = {
  id: string;
  company_id: string;
  plan_id: string;
  status: 'active' | 'pending' | 'overdue' | 'suspended' | 'cancelled';
  starts_at: string | null;
  expires_at: string | null;
  next_due_date: string | null;
  amount: number | null;
  notes: string | null;
  companies?: { name: string } | null;
  subscription_plans?: { name: string } | null;
};

type PaymentRow = {
  id: string;
  subscription_id: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  notes: string | null;
};

const initialSubscriptionForm = {
  company_id: '',
  plan_id: '',
  status: 'active',
  starts_at: '',
  expires_at: '',
  next_due_date: '',
  amount: '',
  notes: '',
};

const initialPaymentForm = {
  subscription_id: '',
  amount: '',
  due_date: '',
  paid_at: '',
  payment_method: 'pix',
  status: 'paid',
  notes: '',
};

export default function Subscriptions() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const [subscriptionForm, setSubscriptionForm] = useState<any>(initialSubscriptionForm);
  const [paymentForm, setPaymentForm] = useState<any>(initialPaymentForm);

  const [loading, setLoading] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === subscriptionForm.plan_id),
    [plans, subscriptionForm.plan_id]
  );

  async function loadBaseData() {
    const [{ data: companiesData }, { data: plansData }] = await Promise.all([
      supabase.from('companies').select('id, name, status').order('name'),
      supabase.from('subscription_plans').select('id, name, price').eq('active', true).order('name'),
    ]);

    setCompanies(companiesData || []);
    setPlans(plansData || []);
  }

  async function loadSubscriptions() {
    const { data, error } = await supabase
      .from('company_subscriptions')
      .select(`
        *,
        companies(name),
        subscription_plans(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setSubscriptions((data || []) as any);
  }

  async function loadPayments() {
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      alert(error.message);
      return;
    }

    setPayments((data || []) as any);
  }

  async function createOrUpdateSubscription() {
    if (!subscriptionForm.company_id) return alert('Selecione a empresa');
    if (!subscriptionForm.plan_id) return alert('Selecione o plano');

    try {
      setLoading(true);

      const payload = {
        company_id: subscriptionForm.company_id,
        plan_id: subscriptionForm.plan_id,
        status: subscriptionForm.status,
        starts_at: subscriptionForm.starts_at || null,
        expires_at: subscriptionForm.expires_at || null,
        next_due_date: subscriptionForm.next_due_date || null,
        amount: subscriptionForm.amount ? Number(subscriptionForm.amount) : selectedPlan?.price ?? 0,
        notes: subscriptionForm.notes || null,
      };

      const { data: existing } = await supabase
        .from('company_subscriptions')
        .select('id')
        .eq('company_id', subscriptionForm.company_id)
        .limit(1)
        .maybeSingle();

      let error;

      if (existing?.id) {
        ({ error } = await supabase
          .from('company_subscriptions')
          .update(payload)
          .eq('id', existing.id));
      } else {
        ({ error } = await supabase.from('company_subscriptions').insert([payload]));
      }

      if (error) throw error;

      const companyStatus = subscriptionForm.status === 'active' ? 'active' : 'inactive';

      await supabase
        .from('companies')
        .update({ status: companyStatus })
        .eq('id', subscriptionForm.company_id);

      alert('Assinatura salva com sucesso');
      setSubscriptionForm(initialSubscriptionForm);
      loadBaseData();
      loadSubscriptions();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar assinatura');
    } finally {
      setLoading(false);
    }
  }

  async function registerPayment() {
    if (!paymentForm.subscription_id) return alert('Selecione a assinatura');
    if (!paymentForm.amount) return alert('Informe o valor');

    try {
      setLoading(true);

      const payload = {
        subscription_id: paymentForm.subscription_id,
        amount: Number(paymentForm.amount),
        due_date: paymentForm.due_date || null,
        paid_at: paymentForm.paid_at || null,
        payment_method: paymentForm.payment_method || null,
        status: paymentForm.status,
        notes: paymentForm.notes || null,
      };

      const { error } = await supabase.from('subscription_payments').insert([payload]);

      if (error) throw error;

      if (paymentForm.status === 'paid') {
        const selectedSubscription = subscriptions.find((s) => s.id === paymentForm.subscription_id);

        if (selectedSubscription) {
          await supabase
            .from('company_subscriptions')
            .update({
              status: 'active',
              next_due_date: paymentForm.due_date || selectedSubscription.next_due_date,
            })
            .eq('id', selectedSubscription.id);

          await supabase
            .from('companies')
            .update({ status: 'active' })
            .eq('id', selectedSubscription.company_id);
        }
      }

      alert('Pagamento registrado com sucesso');
      setPaymentForm(initialPaymentForm);
      loadSubscriptions();
      loadPayments();
    } catch (error: any) {
      alert(error.message || 'Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  }

  async function changeSubscriptionStatus(subscription: SubscriptionRow, status: SubscriptionRow['status']) {
    const { error } = await supabase
      .from('company_subscriptions')
      .update({ status })
      .eq('id', subscription.id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from('companies')
      .update({ status: status === 'active' ? 'active' : 'inactive' })
      .eq('id', subscription.company_id);

    alert('Status da assinatura atualizado');
    loadBaseData();
    loadSubscriptions();
  }

  useEffect(() => {
    loadBaseData();
    loadSubscriptions();
    loadPayments();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Assinaturas</h1>
        <p className="text-sm text-stone-600">
          Controle manual de assinatura, vencimento e bloqueio por empresa.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">Vincular plano à empresa</h2>

          <select
            className="w-full border border-stone-300 rounded-lg px-4 py-3"
            value={subscriptionForm.company_id}
            onChange={(e) => setSubscriptionForm((prev: any) => ({ ...prev, company_id: e.target.value }))}
          >
            <option value="">Selecione a empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <select
            className="w-full border border-stone-300 rounded-lg px-4 py-3"
            value={subscriptionForm.plan_id}
            onChange={(e) =>
              setSubscriptionForm((prev: any) => ({
                ...prev,
                plan_id: e.target.value,
                amount: String(plans.find((p) => p.id === e.target.value)?.price ?? ''),
              }))
            }
          >
            <option value="">Selecione o plano</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - R$ {Number(plan.price).toFixed(2)}
              </option>
            ))}
          </select>

          <select
            className="w-full border border-stone-300 rounded-lg px-4 py-3"
            value={subscriptionForm.status}
            onChange={(e) => setSubscriptionForm((prev: any) => ({ ...prev, status: e.target.value }))}
          >
            <option value="active">Ativa</option>
            <option value="pending">Pendente</option>
            <option value="overdue">Vencida</option>
            <option value="suspended">Suspensa</option>
            <option value="cancelled">Cancelada</option>
          </select>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="date"
              className="border border-stone-300 rounded-lg px-4 py-3"
              value={subscriptionForm.starts_at}
              onChange={(e) => setSubscriptionForm((prev: any) => ({ ...prev, starts_at: e.target.value }))}
            />
            <input
              type="date"
              className="border border-stone-300 rounded-lg px-4 py-3"
              value={subscriptionForm.expires_at}
              onChange={(e) => setSubscriptionForm((prev: any) => ({ ...prev, expires_at: e.target.value }))}
            />
            <input
              type="date"
              className="border border-stone-300 rounded-lg px-4 py-3"
              value={subscriptionForm.next_due_date}
              onChange={(e) => setSubscriptionForm((prev: any) => ({ ...prev, next_due_date: e.target.value }))}
            />
          </div>

          <input
            type="number"
            step="0.01"
            className="w-full border border-stone-300 rounded-lg px-4 py-3"
            placeholder="Valor"
            value={subscriptionForm.amount}
            onChange={(e) => setSubscriptionForm((prev: any) => ({ ...prev, amount: e.target.value }))}
          />

          <textarea
            className="w-full border border-stone-300 rounded-lg px-4 py-3 min-h-[100px]"
            placeholder="Observações"
            value={subscriptionForm.notes}
            onChange={(e) => setSubscriptionForm((prev: any) => ({ ...prev, notes: e.target.value }))}
          />

          <button
            onClick={createOrUpdateSubscription}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar assinatura'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">Registrar pagamento manual</h2>

          <select
            className="w-full border border-stone-300 rounded-lg px-4 py-3"
            value={paymentForm.subscription_id}
            onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, subscription_id: e.target.value }))}
          >
            <option value="">Selecione a assinatura</option>
            {subscriptions.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {(sub.companies as any)?.name || sub.company_id} • {(sub.subscription_plans as any)?.name || sub.plan_id}
              </option>
            ))}
          </select>

          <input
            type="number"
            step="0.01"
            className="w-full border border-stone-300 rounded-lg px-4 py-3"
            placeholder="Valor pago"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, amount: e.target.value }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="date"
              className="border border-stone-300 rounded-lg px-4 py-3"
              value={paymentForm.due_date}
              onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, due_date: e.target.value }))}
            />
            <input
              type="date"
              className="border border-stone-300 rounded-lg px-4 py-3"
              value={paymentForm.paid_at}
              onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, paid_at: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="border border-stone-300 rounded-lg px-4 py-3"
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, payment_method: e.target.value }))}
            >
              <option value="pix">PIX</option>
              <option value="cash">Dinheiro</option>
              <option value="card">Cartão</option>
              <option value="transfer">Transferência</option>
              <option value="other">Outro</option>
            </select>

            <select
              className="border border-stone-300 rounded-lg px-4 py-3"
              value={paymentForm.status}
              onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, status: e.target.value }))}
            >
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <textarea
            className="w-full border border-stone-300 rounded-lg px-4 py-3 min-h-[100px]"
            placeholder="Observações do pagamento"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, notes: e.target.value }))}
          />

          <button
            onClick={registerPayment}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Registrar pagamento'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-200">
          <h2 className="text-lg font-semibold">Assinaturas cadastradas</h2>
        </div>

        <div className="divide-y divide-stone-200">
          {subscriptions.length === 0 && <div className="p-6 text-sm text-stone-500">Nenhuma assinatura cadastrada.</div>}

          {subscriptions.map((sub) => (
            <div key={sub.id} className="p-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-stone-900">{(sub.companies as any)?.name || sub.company_id}</h3>
                <p className="text-sm text-stone-600">
                  Plano: {(sub.subscription_plans as any)?.name || sub.plan_id} • Valor: R$ {Number(sub.amount || 0).toFixed(2)}
                </p>
                <p className="text-sm text-stone-500">
                  Próximo vencimento: {sub.next_due_date || 'Não informado'} • Expira em: {sub.expires_at || 'Não informado'}
                </p>
                {sub.notes && <p className="text-sm text-stone-500 mt-1">{sub.notes}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    sub.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : sub.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : sub.status === 'overdue'
                      ? 'bg-orange-100 text-orange-700'
                      : sub.status === 'suspended'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {sub.status}
                </span>

                <button
                  onClick={() => changeSubscriptionStatus(sub, 'active')}
                  className="px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm"
                >
                  Ativar
                </button>

                <button
                  onClick={() => changeSubscriptionStatus(sub, 'overdue')}
                  className="px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm"
                >
                  Vencida
                </button>

                <button
                  onClick={() => changeSubscriptionStatus(sub, 'suspended')}
                  className="px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm"
                >
                  Suspender
                </button>

                <button
                  onClick={() => changeSubscriptionStatus(sub, 'cancelled')}
                  className="px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-200">
          <h2 className="text-lg font-semibold">Últimos pagamentos</h2>
        </div>

        <div className="divide-y divide-stone-200">
          {payments.length === 0 && <div className="p-6 text-sm text-stone-500">Nenhum pagamento registrado.</div>}

          {payments.map((payment) => (
            <div key={payment.id} className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900">R$ {Number(payment.amount).toFixed(2)}</p>
                <p className="text-sm text-stone-500">
                  Vencimento: {payment.due_date || '—'} • Pago em: {payment.paid_at || '—'}
                </p>
                {payment.notes && <p className="text-sm text-stone-500">{payment.notes}</p>}
              </div>

              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  payment.status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : payment.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {payment.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
