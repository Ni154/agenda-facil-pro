import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Client } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';

const clientSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  document_number: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  status: z.enum(['active', 'inactive']),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: Client;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const { companyUser } = useAuth();
  const companyId = useEffectiveCompany();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: client ? {
      full_name: client.full_name,
      document_number: client.document_number || '',
      birth_date: client.birth_date || '',
      gender: client.gender as any,
      status: client.status as any,
    } : {
      status: 'active',
    }
  });

  const onSubmit = async (data: ClientFormData) => {
    if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      if (client) {
        const { error } = await supabase
          .from('clients')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', client.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([{
            ...data,
            company_id: companyId,
          }]);
        
        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erro ao salvar cliente. Verifique os dados e tente novamente.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-sm font-bold text-stone-700">Nome Completo *</label>
          <input
            {...register('full_name')}
            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            placeholder="Ex: João Silva"
          />
          {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-stone-700">CPF/Documento</label>
          <input
            {...register('document_number')}
            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            placeholder="000.000.000-00"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-stone-700">Data de Nascimento</label>
          <input
            {...register('birth_date')}
            type="date"
            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-stone-700">Gênero</label>
          <select
            {...register('gender')}
            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          >
            <option value="">Selecione...</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
            <option value="other">Outro</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-stone-700">Status</label>
          <select
            {...register('status')}
            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 rounded-xl transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-200"
        >
          {isSubmitting ? 'Salvando...' : client ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
        </button>
      </div>
    </form>
  );
}
