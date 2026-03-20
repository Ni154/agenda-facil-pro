import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  User,
  Clock,
  Activity,
  Database,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { formatDate } from '../lib/utils';

export default function ActivityLogs() {
  const { role } = useAuth();
  const companyId = useEffectiveCompany();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (companyId) {
      loadLogs();
    } else {
      setLoading(false);
    }
  }, [companyId]);

  async function loadLogs() {
    if (!companyId) {
      alert('Selecione uma empresa para continuar.');
      return;
    }

    try {
      setLoading(true);

      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (role !== 'superadmin') {
        query = query.eq('company_id', companyId);
      }

      const { data } = await query;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter((l: any) =>
    `${l.action || ''} ${l.entity || ''} ${l.user_email || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionIcon = (action: string) => {
    if (action?.includes('create') || action?.includes('insert')) return <Database size={16} className="text-emerald-500" />;
    if (action?.includes('update')) return <Activity size={16} className="text-blue-500" />;
    if (action?.includes('delete')) return <AlertCircle size={16} className="text-red-500" />;
    return <History size={16} className="text-stone-400" />;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Logs de Atividade</h1>
        <p className="text-stone-500">Histórico de ações realizadas no sistema.</p>
      </header>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por ação, entidade ou usuário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 bg-white"
        />
      </div>

      {loading ? (
        <div>Carregando logs...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-200">
            {filteredLogs.length === 0 ? (
              <div className="p-6 text-sm text-stone-500">Nenhum log encontrado.</div>
            ) : (
              filteredLogs.map((log: any) => (
                <div key={log.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {getActionIcon(log.action)}
                    <span>{log.action}</span>
                  </div>
                  <div className="text-xs text-stone-500 flex items-center gap-4">
                    <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(log.created_at)}</span>
                    <span className="flex items-center gap-1"><User size={12} /> {log.user_email || 'sem usuário'}</span>
                    <span>{log.entity}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
