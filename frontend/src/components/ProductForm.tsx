import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { Product } from '../types';

const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  product_type: z.enum(['resale', 'internal_use', 'supply']),
  price: z.string().min(1, 'Preço é obrigatório'),
  cost_price: z.string().optional(),
  stock_quantity: z.number().min(0, 'Estoque não pode ser negativo'),
  min_stock_level: z.number().min(0, 'Nível mínimo não pode ser negativo'),
  status: z.enum(['active', 'inactive']),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  useAuth();
  const companyId = useEffectiveCompany();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      name: product.name,
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      description: product.description ?? '',
      product_type: (product.product_type as any) || 'resale',
      price: product.price.toString(),
      cost_price: product.cost_price?.toString() ?? '',
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      status: product.status as any,
    } : {
      product_type: 'resale',
      stock_quantity: 0,
      min_stock_level: 0,
      status: 'active',
    },
  });

  async function onSubmit(data: ProductFormData) {
    if (!companyId) {
      alert('Selecione uma empresa para continuar.');
      return;
    }

    try {
      const payload = {
        ...data,
        company_id: companyId,
        price: parseFloat(data.price),
        cost_price: data.cost_price ? parseFloat(data.cost_price) : null,
      };

      if (product) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
      }

      alert(product ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.');
      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Erro ao salvar produto.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-stone-700 mb-1">Nome do Produto *</label>
          <input {...register('name')} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Shampoo Hidratante 500ml" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Tipo de Produto *</label>
          <select {...register('product_type')} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="resale">Revenda</option>
            <option value="internal_use">Uso interno</option>
            <option value="supply">Insumo/consumo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">SKU</label>
          <input {...register('sku')} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Código interno" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Código de Barras</label>
          <input {...register('barcode')} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Opcional" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Preço *</label>
          <input {...register('price')} type="number" step="0.01" className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0,00" />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Custo</label>
          <input {...register('cost_price')} type="number" step="0.01" className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0,00" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Estoque atual</label>
          <input {...register('stock_quantity', { valueAsNumber: true })} type="number" className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Estoque mínimo</label>
          <input {...register('min_stock_level', { valueAsNumber: true })} type="number" className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
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
          <textarea {...register('description')} rows={3} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Detalhes do produto..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50">
          {isSubmitting ? 'Salvando...' : product ? 'Atualizar Produto' : 'Cadastrar Produto'}
        </button>
      </div>
    </form>
  );
}
