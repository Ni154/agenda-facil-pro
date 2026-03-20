import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { Service, ServiceCategory } from '../types';

const serviceSchema = z.object({
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  duration_minutes: z.number().min(1, 'Duração mínima é 1 minuto'),
  price: z.string().min(1, 'Preço é obrigatório'),
  status: z.enum(['active', 'inactive']),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  service?: Service;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ServiceForm({ service, onSuccess, onCancel }: ServiceFormProps) {
  useAuth();
  const companyId = useEffectiveCompany();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: service ? {
      category_id: service.category_id || '',
      name: service.name,
      description: service.description ?? '',
      duration_minutes: service.duration_minutes,
      price: service.price.toString(),
      status: service.status as any,
    } : {
      duration_minutes: 30,
      status: 'active',
    },
  });

  useEffect(() => {
    if (companyId) loadCategories();
  }, [companyId]);

  async function loadCategories() {
    if (!companyId) return;
    const { data } = await supabase.from('service_categories').select('*').eq('company_id', companyId).order('name');
    setCategories(data || []);
  }

  async function createQuickCategory() {
    if (!companyId) return alert('Selecione uma empresa para continuar.');
    if (!newCategory.trim()) return alert('Digite o nome da categoria.');
    const { data, error } = await supabase
      .from('service_categories')
      .insert([{ company_id: companyId, name: newCategory.trim() }])
      .select()
      .single();
    if (error) return alert(error.message);
    setNewCategory('');
    await loadCategories();
    if (data?.id) setValue('category_id', data.id);
    alert('Categoria criada com sucesso.');
  }

  async function onSubmit(data: ServiceFormData) {
    if (!companyId) return alert('Selecione uma empresa para continuar.');
    try {
      const payload = { ...data, company_id: companyId, price: parseFloat(data.price) };
      if (service) {
        const { error } = await supabase.from('services').update(payload).eq('id', service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('services').insert([payload]);
        if (error) throw error;
      }
      alert(service ? 'Serviço atualizado com sucesso.' : 'Serviço cadastrado com sucesso.');
      onSuccess();
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Erro ao salvar serviço.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-stone-700 mb-1">Nome do Serviço *</label>
          <input {...register('name')} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Limpeza de pele" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Categoria *</label>
          <select {...register('category_id')} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Selecione uma categoria</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-700 mb-1">Criar categoria rápida</label>
          <div className="flex gap-2">
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Facial" />
            <button type="button" onClick={createQuickCategory} className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm">Criar</button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Duração (minutos) *</label>
          <input {...register('duration_minutes', { valueAsNumber: true })} type="number" className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
          {errors.duration_minutes && <p className="text-red-500 text-xs mt-1">{errors.duration_minutes.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Preço *</label>
          <input {...register('price')} type="number" step="0.01" className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0,00" />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
          <select {...register('status')} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-stone-700 mb-1">Descrição</label>
          <textarea {...register('description')} rows={3} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Detalhes do serviço..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50">
          {isSubmitting ? 'Salvando...' : service ? 'Atualizar Serviço' : 'Cadastrar Serviço'}
        </button>
      </div>
    </form>
  );
}
