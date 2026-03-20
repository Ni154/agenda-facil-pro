import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';
import { Company } from '../types';

const companySchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  document_number: z.string().min(11, 'Documento inválido'),
  status: z.enum(['active', 'inactive', 'suspended']),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  company?: Company;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: company ? {
      name: company.name,
      document_number: company.document_number,
      status: company.status,
      logo_url: company.logo_url ?? '',
    } : {
      status: 'active',
    },
  });

  async function onSubmit(data: CompanyFormData) {
    try {
      if (company) {
        const { error } = await supabase
          .from('companies')
          .update(data)
          .eq('id', company.id);
        if (error) throw error;
      } else {
        // For new companies, we'd also need to assign a plan.
        // For now, we'll assume a default plan exists or just omit it if nullable.
        const { error } = await supabase
          .from('companies')
          .insert([data]);
        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Erro ao salvar empresa.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Nome da Empresa *</label>
        <input
          {...register('name')}
          className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Razão Social ou Nome Fantasia"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">CNPJ / CPF *</label>
        <input
          {...register('document_number')}
          className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="00.000.000/0000-00"
        />
        {errors.document_number && <p className="text-red-500 text-xs mt-1">{errors.document_number.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
          <select
            {...register('status')}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="active">Ativa</option>
            <option value="inactive">Inativa</option>
            <option value="suspended">Suspensa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">URL do Logo</label>
          <input
            {...register('logo_url')}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="https://..."
          />
          {errors.logo_url && <p className="text-red-500 text-xs mt-1">{errors.logo_url.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando...' : company ? 'Atualizar Empresa' : 'Cadastrar Empresa'}
        </button>
      </div>
    </form>
  );
}
