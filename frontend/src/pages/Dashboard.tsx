import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import {
  Users,
  Calendar,
  DollarSign,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { profile } = useAuth();
  const companyId = useEffectiveCompany();

  const [stats, setStats] = useState({
    totalSales: 0,
    totalClients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    pendingReceivables: 0,
    pendingPayables: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [companyId]);

  async function loadDashboardData() {
    if (!companyId) {
      alert('Selecione uma empresa para continuar.');
      return;
    }

    try {
      setLoading(true);

      const [
        salesRes,
        clientsRes,
        appointmentsRes,
        receivablesRes,
        payablesRes,
        recentSalesRes,
        recentAppointmentsRes,
      ] = await Promise.all([
        supabase.from('sales').select('final_amount').eq('company_id', companyId),
        supabase.from('clients').select('id', { count: 'exact' }).eq('company_id', companyId),
        supabase.from('appointments').select('id', { count: 'exact' }).eq('company_id', companyId),
        supabase.from('accounts_receivable').select('amount').eq('company_id', companyId).eq('status', 'pending'),
        supabase.from('accounts_payable').select('amount').eq('company_id', companyId).eq('status', 'pending'),
        supabase.from('sales').select('*, client:clients(full_name)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
        supabase.from('appointments').select('*, client:clients(full_name)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
      ]);

      const totalRevenue = salesRes.data?.reduce((acc, sale) => acc + Number(sale.final_amount || 0), 0) || 0;
      const pendingReceivables = receivablesRes.data?.reduce((acc, rec) => acc + Number(rec.amount || 0), 0) || 0;
      const pendingPayables = payablesRes.data?.reduce((acc, pay) => acc + Number(pay.amount || 0), 0) || 0;

      setStats({
        totalSales: salesRes.data?.length || 0,
        totalClients: clientsRes.count || 0,
        totalAppointments: appointmentsRes.count || 0,
        totalRevenue,
        pendingReceivables,
        pendingPayables,
      });

      setRecentSales(recentSalesRes.data || []);
      setRecentAppointments(recentAppointmentsRes.data || []);

      setChartData([
        { name: 'Seg', revenue: 4000, appointments: 24 },
        { name: 'Ter', revenue: 3000, appointments: 18 },
        { name: 'Qua', revenue: 2000, appointments: 15 },
        { name: 'Qui', revenue: 2780, appointments: 20 },
        { name: 'Sex', revenue: 1890, appointments: 12 },
        { name: 'Sáb', revenue: 2390, appointments: 16 },
        { name: 'Dom', revenue: 3490, appointments: 22 },
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-bold text-stone-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-stone-900">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1">
              {trend === 'up' ? (
                <ArrowUpRight className="text-emerald-500" size={16} />
              ) : (
                <ArrowDownRight className="text-red-500" size={16} />
              )}
              <span
                className={cn(
                  'text-xs font-bold',
                  trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                )}
              >
                {trendValue}%
              </span>
              <span className="text-xs text-stone-400 font-medium">vs mês anterior</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm',
            color === 'emerald'
              ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
              : color === 'blue'
              ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
              : color === 'purple'
              ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
              : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
          )}
        >
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div>Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Olá, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-stone-500">Aqui está o resumo do seu negócio hoje.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Faturamento Total" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} trend="up" trendValue="12.5" color="emerald" />
        <StatCard title="Clientes" value={stats.totalClients} icon={Users} trend="up" trendValue="8.2" color="blue" />
        <StatCard title="Agendamentos" value={stats.totalAppointments} icon={Calendar} trend="down" trendValue="3.1" color="purple" />
        <StatCard title="Vendas" value={stats.totalSales} icon={ShoppingBag} trend="up" trendValue="15.4" color="amber" />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <h3 className="text-lg font-bold text-stone-800 mb-4">Desempenho Semanal</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-stone-800 mb-3">Últimas vendas</h3>
        <pre className="text-xs overflow-auto bg-white p-4 rounded-xl border border-stone-200">
          {JSON.stringify(recentSales, null, 2)}
        </pre>
      </div>

      <div>
        <h3 className="text-lg font-bold text-stone-800 mb-3">Últimos agendamentos</h3>
        <pre className="text-xs overflow-auto bg-white p-4 rounded-xl border border-stone-200">
          {JSON.stringify(recentAppointments, null, 2)}
        </pre>
      </div>
    </div>
  );
}
