import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowUpRight,
  MoreVertical,
  Edit2,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectiveCompany } from '../../hooks/useEffectiveCompany';
import { AccountReceivable } from '../../types';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import Modal from '../../components/Modal';
import ReceivableForm from '../../components/ReceivableForm';

export default function Receivables() {
  const { companyUser } = useAuth();
  const companyId = useEffectiveCompany();
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<AccountReceivable | undefined>();

  useEffect(() => {
    if (companyId) {
      loadReceivables();
    }
  }, [companyId]);

  async function loadReceivables() {
        if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      setLoading(true);
      const { data } = await supabase
        .from('accounts_receivable')
        .select('*')
        .eq('company_id', companyId)
        .order('due_date', { ascending: true });
      
      setReceivables(data || []);
    } catch (error) {
      console.error('Error loading receivables:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsPaid(id: string) {
    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      loadReceivables();
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Erro ao baixar conta.');
    }
  }

  const filteredReceivables = receivables.filter(r => 
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalPending: receivables.filter(r => r.status === 'pending').reduce((acc, r) => acc + Number(r.amount), 0),
    totalPaid: receivables.filter(r => r.status === 'paid').reduce((acc, r) => acc + Number(r.amount), 0),
    totalOverdue: receivables.filter(r => r.status === 'pending' && new Date(r.due_date) < new Date()).reduce((acc, r) => acc + Number(r.amount), 0)
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Contas a Receber</h1>
          <p className="text-stone-500">Acompanhe seus recebimentos e fluxo de caixa.</p>
        </div>
        <button 
          onClick={() => {
            setEditingReceivable(undefined);
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors shadow-lg shadow-emerald-200"
        >
          <Plus size={18} />
          Novo Recebível
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-1">Total Pendente</p>
          <h3 className="text-2xl font-bold text-stone-900">{formatCurrency(stats.totalPending)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-1">Total Recebido (Mês)</p>
          <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalPaid)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-1">Total em Atraso</p>
          <h3 className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOverdue)}</h3>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por descrição..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
          <Filter size={18} />
          Filtros
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/50 border-b border-stone-100">
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-8"></div></td>
                  </tr>
                ))
              ) : filteredReceivables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-500">
                    Nenhuma conta encontrada.
                  </td>
                </tr>
              ) : (
                filteredReceivables.map(receivable => (
                  <tr key={receivable.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-stone-800">{receivable.description}</p>
                      <p className="text-[10px] text-stone-400 font-mono uppercase">Origem: {receivable.source_type}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-stone-600">
                        <Calendar size={14} className="text-stone-400" />
                        <span className={cn(
                          receivable.status === 'pending' && new Date(receivable.due_date) < new Date() ? "text-red-600 font-bold" : ""
                        )}>
                          {formatDate(receivable.due_date as any)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-stone-700">
                      {formatCurrency(Number(receivable.amount))}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit",
                        receivable.status === 'paid' ? "bg-emerald-100 text-emerald-700" : 
                        receivable.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"
                      )}>
                        {receivable.status === 'paid' ? <CheckCircle2 size={12} /> : 
                         receivable.status === 'pending' ? <Clock size={12} /> : <XCircle size={12} />}
                        {receivable.status === 'paid' ? 'Recebido' : 
                         receivable.status === 'pending' ? 'Pendente' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {receivable.status === 'pending' && (
                          <button 
                            onClick={() => handleMarkAsPaid(receivable.id)}
                            className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
                            title="Baixar Conta"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setEditingReceivable(receivable);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReceivable ? "Editar Recebível" : "Novo Recebível"}
      >
        <ReceivableForm
          receivable={editingReceivable}
          onSuccess={() => {
            setIsModalOpen(false);
            loadReceivables();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
