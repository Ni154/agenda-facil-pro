import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { AccountReceivable } from '../types';

const receivableSchema = z.object({
  description: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  due_date: z.string().min(1, 'Data de vencimento é obrigatória'),
  status: z.enum(['pending', 'paid', 'cancelled']),
  payment_method: z.enum(['cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer']).optional(),
});

type ReceivableFormData = z.infer<typeof receivableSchema>;

interface ReceivableFormProps {
  receivable?: AccountReceivable;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ReceivableForm({ receivable, onSuccess, onCancel }: ReceivableFormProps) {
  const { companyUser } = useAuth();
  const companyId = useEffectiveCompany();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReceivableFormData>({
    resolver: zodResolver(receivableSchema),
    defaultValues: receivable ? {
      description: receivable.description,
      amount: receivable.amount.toString(),
      due_date: receivable.due_date.split('T')[0],
      status: receivable.status,
      payment_method: (receivable.payment_method as any) ?? undefined,
    } : {
      status: 'pending',
      due_date: new Date().toISOString().split('T')[0],
    },
  });

  async function onSubmit(data: ReceivableFormData) {
        if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      const payload = {
        ...data,
        company_id: companyId,
        amount: parseFloat(data.amount),
        source_type: 'manual',
        paid_at: data.status === 'paid' ? new Date().toISOString() : null,
      };

      if (receivable) {
        const { error } = await supabase
          .from('accounts_receivable')
          .update(payload)
          .eq('id', receivable.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('accounts_receivable')
          .insert([payload]);
        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving receivable:', error);
      alert('Erro ao salvar conta a receber.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Descrição *</label>
        <input
          {...register('description')}
          className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Ex: Venda avulsa ou ajuste"
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Valor *</label>
          <input
            {...register('amount')}
            type="number"
            step="0.01"
            className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0,00"
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Data de Vencimento *</label>
          <input
            {...register('due_date')}
            type="date"
            className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {errors.due_date && <p className="text-red-500 text-xs mt-1">{errors.due_date.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
          <select
            {...register('status')}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Método de Pagamento</label>
          <select
            {...register('payment_method')}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Selecione...</option>
            <option value="cash">Dinheiro</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="debit_card">Cartão de Débito</option>
            <option value="pix">PIX</option>
            <option value="bank_transfer">Transferência</option>
          </select>
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
          {isSubmitting ? 'Salvando...' : receivable ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
}
