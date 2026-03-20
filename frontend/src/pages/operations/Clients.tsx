import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  UserPlus, 
  Mail, 
  Phone, 
  Calendar,
  FileText,
  PenTool,
  Trash2,
  Edit2,
  ClipboardCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectiveCompany } from '../../hooks/useEffectiveCompany';
import { Client } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import Modal from '../../components/Modal';
import ClientForm from '../../components/ClientForm';
import AnamnesisFormDialog from '../../components/AnamnesisFormDialog';

export default function Clients() {
  const { companyUser } = useAuth();
  const companyId = useEffectiveCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnamnesisModalOpen, setIsAnamnesisModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);

  useEffect(() => {
    if (companyId) {
      loadClients();
    }
  }, [companyId]);

  async function loadClients() {
        if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      setLoading(true);
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name');
      
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'inactive' })
        .eq('id', id);
      
      if (error) throw error;
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erro ao excluir cliente.');
    }
  }

  const filteredClients = clients.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document_number?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Clientes</h1>
          <p className="text-stone-500">Gerencie sua base de clientes e prontuários.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedClient(undefined);
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          <UserPlus size={18} />
          Novo Cliente
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou CPF..." 
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
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Nome do Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-stone-100 rounded w-8"></div></td>
                  </tr>
                ))
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                          {client.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-stone-800">{client.full_name}</p>
                          <p className="text-xs text-stone-400">Desde {formatDate(client.created_at as any)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600 font-medium">
                      {client.document_number || 'Não informado'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        client.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600"
                      )}>
                        {client.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedClient(client);
                            setIsAnamnesisModalOpen(true);
                          }}
                          className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
                          title="Anamnese"
                        >
                          <ClipboardCheck size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedClient(client);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                          title="Editar / Prontuário"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(client.id)}
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
        title={selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <ClientForm
          client={selectedClient}
          onSuccess={() => {
            setIsModalOpen(false);
            loadClients();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isAnamnesisModalOpen}
        onClose={() => setIsAnamnesisModalOpen(false)}
        title={`Anamnese: ${selectedClient?.full_name}`}
      >
        {selectedClient && (
          <AnamnesisFormDialog
            client={selectedClient}
            onSuccess={() => {
              setIsAnamnesisModalOpen(false);
              alert('Anamnese salva com sucesso!');
            }}
            onCancel={() => setIsAnamnesisModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
