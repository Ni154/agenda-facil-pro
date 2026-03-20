import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  DollarSign, 
  Edit2, 
  Trash2, 
  CheckCircle2,
  XCircle,
  Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectiveCompany } from '../../hooks/useEffectiveCompany';
import { Service, ServiceCategory } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import Modal from '../../components/Modal';
import ServiceForm from '../../components/ServiceForm';

export default function Services() {
  const { companyUser } = useAuth();
  const companyId = useEffectiveCompany();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  async function loadData() {
        if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      setLoading(true);
      const [servicesRes, categoriesRes] = await Promise.all([
        supabase
          .from('services')
          .select('*, category:service_categories(*)')
          .eq('company_id', companyId)
          .order('name'),
        supabase
          .from('service_categories')
          .select('*')
          .eq('company_id', companyId)
          .order('name')
      ]);
      
      setServices(servicesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteService(id: string) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      const { error } = await supabase
        .from('services')
        .update({ status: 'inactive' })
        .eq('id', id);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Erro ao excluir serviço.');
    }
  }

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s as any).category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Serviços</h1>
          <p className="text-stone-500">Gerencie seu catálogo de serviços e durações.</p>
        </div>
        <button 
          onClick={() => {
            setEditingService(undefined);
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors shadow-lg shadow-emerald-200"
        >
          <Plus size={18} />
          Novo Serviço
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou categoria..." 
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
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Serviço</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Duração</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Preço</th>
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
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-8"></div></td>
                  </tr>
                ))
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                    Nenhum serviço encontrado.
                  </td>
                </tr>
              ) : (
                filteredServices.map(service => (
                  <tr key={service.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-stone-800">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-stone-400 truncate max-w-xs">{service.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider">
                        <Tag size={10} />
                        {(service as any).category?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-stone-600">
                        <Clock size={14} className="text-stone-400" />
                        {service.duration_minutes} min
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-stone-700">
                      {formatCurrency(Number(service.price))}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit",
                        service.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
                      )}>
                        {service.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {service.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingService(service);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                          title="Excluir"
                        >
                          <Trash2 size={18} />
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
        title={editingService ? "Editar Serviço" : "Novo Serviço"}
      >
        <ServiceForm
          service={editingService}
          onSuccess={() => {
            setIsModalOpen(false);
            loadData();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
