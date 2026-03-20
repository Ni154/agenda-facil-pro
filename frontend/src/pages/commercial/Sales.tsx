import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign,
  ChevronRight,
  Eye,
  XCircle,
  Download,
  CheckCircle2,
  Trash2,
  ArrowUpRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectiveCompany } from '../../hooks/useEffectiveCompany';
import { Sale } from '../../types';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import Modal from '../../components/Modal';
import SaleForm from '../../components/SaleForm';

export default function Sales() {
  const { companyUser } = useAuth();
  const companyId = useEffectiveCompany();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadSales();
    }
  }, [companyId]);

  async function loadSales() {
        if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      setLoading(true);
      const { data } = await supabase
        .from('sales')
        .select('*, client:clients(*), items:sale_items(*, product:products(name), service:services(name))')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      setSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSale(sale: Sale) {
    if (!confirm('Tem certeza que deseja cancelar esta venda? Esta ação reverterá o estoque e cancelará recebíveis pendentes.')) return;

    try {
      // 1. Update Sale Status
      const { error: saleError } = await supabase
        .from('sales')
        .update({ status: 'cancelled' })
        .eq('id', sale.id);
      
      if (saleError) throw saleError;

      // 2. Revert Stock for products
      if (sale.items) {
        for (const item of sale.items) {
          if (item.product_id) {
            // Record movement (DB trigger tr_update_stock_on_movement handles products.stock_quantity)
            await supabase.from('stock_movements').insert([{
              company_id: companyUser?.company_id,
              product_id: item.product_id,
              movement_type: 'in',
              quantity: item.quantity,
              reason: `Cancelamento Venda #${sale.id.slice(0, 8)}`,
              movement_source: 'cancellation',
              created_by: companyUser?.profile_id
            }]);
          }
        }
      }

      // 3. Cancel Account Receivable
      await supabase
        .from('accounts_receivable')
        .update({ status: 'cancelled' })
        .eq('sale_id', sale.id);

      loadSales();
    } catch (error) {
      console.error('Error cancelling sale:', error);
      alert('Erro ao cancelar venda.');
    }
  }

  const filteredSales = sales.filter(s => 
    s.client?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.includes(searchTerm)
  );

  const stats = {
    totalSales: sales.filter(s => s.status === 'completed').length,
    totalRevenue: sales.filter(s => s.status === 'completed').reduce((acc, s) => acc + Number(s.final_amount), 0),
    avgTicket: sales.filter(s => s.status === 'completed').length > 0 
      ? sales.filter(s => s.status === 'completed').reduce((acc, s) => acc + Number(s.final_amount), 0) / sales.filter(s => s.status === 'completed').length 
      : 0
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Vendas</h1>
          <p className="text-stone-500">Gerencie transações, produtos e serviços.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors shadow-lg shadow-emerald-200"
        >
          <Plus size={18} />
          Nova Venda
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-1">Total de Vendas (Mês)</p>
          <h3 className="text-2xl font-bold text-stone-900">{stats.totalSales}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-1">Ticket Médio</p>
          <h3 className="text-2xl font-bold text-stone-900">{formatCurrency(stats.avgTicket)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-1">Receita Total</p>
          <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</h3>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou ID da venda..." 
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
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Data / ID</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Valor Final</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-8"></div></td>
                  </tr>
                ))
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-500">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-stone-800">{formatDate(sale.created_at as any)}</p>
                      <p className="text-[10px] text-stone-400 font-mono uppercase">#{sale.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600 font-medium">
                      {sale.client?.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                      {formatCurrency(Number(sale.final_amount))}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit",
                        sale.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {sale.status === 'completed' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {sale.status === 'completed' ? 'Concluída' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedSale(sale);
                            setIsDetailsOpen(true);
                          }}
                          className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {sale.status === 'completed' && (
                          <button 
                            onClick={() => handleCancelSale(sale)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                            title="Cancelar Venda"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
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
        title="Nova Venda"
      >
        <SaleForm
          onSuccess={() => {
            setIsModalOpen(false);
            loadSales();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Detalhes da Venda"
      >
        {selectedSale && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase">Cliente</p>
                <p className="text-sm font-medium text-stone-900">{selectedSale.client?.full_name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase">Data</p>
                <p className="text-sm font-medium text-stone-900">{formatDate(selectedSale.created_at as any)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase">Status</p>
                <p className="text-sm font-medium text-stone-900 uppercase">{selectedSale.status}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase">ID</p>
                <p className="text-xs font-mono text-stone-500">{selectedSale.id}</p>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <p className="text-xs font-bold text-stone-400 uppercase mb-3">Itens</p>
              <div className="space-y-2">
                {selectedSale.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-stone-800">
                        {item.product?.name || item.service?.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {item.quantity}x {formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-stone-900">
                      {formatCurrency(Number(item.total_price))}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Subtotal</span>
                <span className="font-medium text-stone-900">{formatCurrency(Number(selectedSale.gross_amount))}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Desconto</span>
                <span>- {formatCurrency(Number(selectedSale.discount_amount))}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-stone-100">
                <span className="text-stone-900">Total</span>
                <span className="text-emerald-600">{formatCurrency(Number(selectedSale.final_amount))}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
