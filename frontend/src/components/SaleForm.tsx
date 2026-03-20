import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sale, Client, Product, Service } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';

const saleSchema = z.object({
  client_id: z.string().min(1, 'Selecione um cliente'),
  discount_amount: z.number().min(0),
  items: z.array(z.object({
    product_id: z.string().nullable(),
    service_id: z.string().nullable(),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
  })).min(1, 'Adicione pelo menos um item'),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface SaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SaleForm({ onSuccess, onCancel }: SaleFormProps) {
  const { companyUser, user } = useAuth();
  const companyId = useEffectiveCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      discount_amount: 0,
      items: [{ product_id: null, service_id: null, quantity: 1, unit_price: 0 }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch('items');
  const watchedDiscount = watch('discount_amount');

  const grossAmount = watchedItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const finalAmount = Math.max(0, grossAmount - watchedDiscount);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  async function loadData() {
        if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      setLoading(true);
      const [clientsRes, productsRes, servicesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('company_id', companyId).is('deleted_at', null).order('full_name'),
        supabase.from('products').select('*').eq('company_id', companyId).order('name'),
        supabase.from('services').select('*').eq('company_id', companyId).eq('status', 'active').order('name')
      ]);

      setClients(clientsRes.data || []);
      setProducts(productsRes.data || []);
      setServices(servicesRes.data || []);
    } catch (error) {
      console.error('Error loading form data:', error);
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: SaleFormData) => {
    if (!companyId || !user) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      // 1. Create Sale
      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          company_id: companyId,
          client_id: data.client_id,
          gross_amount: grossAmount,
          discount_amount: data.discount_amount,
          final_amount: finalAmount,
          status: 'completed',
          created_by: user.id,
        }])
        .select()
        .single();
      
      if (saleError) throw saleError;

      // 2. Create Sale Items
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(data.items.map(item => ({
          sale_id: newSale.id,
          product_id: item.product_id,
          service_id: item.service_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
        })));
      
      if (itemsError) throw itemsError;

      // 3. Create Account Receivable
      const { error: receivableError } = await supabase
        .from('accounts_receivable')
        .insert([{
          company_id: companyId,
          sale_id: newSale.id,
          amount: finalAmount,
          description: `Venda #${newSale.id.slice(0, 8)}`,
          due_date: new Date().toISOString(),
          status: 'pending',
        }]);
      
      if (receivableError) throw receivableError;

      onSuccess();
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Erro ao salvar venda.');
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500">Carregando dados...</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-stone-700">Cliente *</label>
        <select
          {...register('client_id')}
          className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        >
          <option value="">Selecione um cliente...</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
        {errors.client_id && <p className="text-xs text-red-500">{errors.client_id.message}</p>}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-stone-700">Itens da Venda *</label>
          <button
            type="button"
            onClick={() => append({ product_id: null, service_id: null, quantity: 1, unit_price: 0 })}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            + Adicionar Item
          </button>
        </div>
        
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-12 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100 items-end">
            <div className="col-span-6 space-y-1.5">
              <select
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('p:')) {
                    const id = val.replace('p:', '');
                    const product = products.find(p => p.id === id);
                    setValue(`items.${index}.product_id`, id);
                    setValue(`items.${index}.service_id`, null);
                    if (product) setValue(`items.${index}.unit_price`, product.price);
                  } else if (val.startsWith('s:')) {
                    const id = val.replace('s:', '');
                    const service = services.find(s => s.id === id);
                    setValue(`items.${index}.service_id`, id);
                    setValue(`items.${index}.product_id`, null);
                    if (service) setValue(`items.${index}.unit_price`, service.price);
                  }
                }}
              >
                <option value="">Selecione um item...</option>
                <optgroup label="Produtos">
                  {products.map(p => (
                    <option key={p.id} value={`p:${p.id}`}>{p.name} (Estoque: {p.stock_quantity})</option>
                  ))}
                </optgroup>
                <optgroup label="Serviços">
                  {services.map(s => (
                    <option key={s.id} value={`s:${s.id}`}>{s.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <input
                {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                type="number"
                min="1"
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Qtd"
              />
            </div>
            <div className="col-span-3 space-y-1.5">
              <input
                {...register(`items.${index}.unit_price` as const, { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Preço"
              />
            </div>
            <div className="col-span-1 flex justify-center">
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        ))}
        {errors.items && <p className="text-xs text-red-500">{errors.items.message}</p>}
      </div>

      <div className="bg-stone-50 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Subtotal</span>
          <span className="font-bold text-stone-900">R$ {grossAmount.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Desconto</span>
          <div className="w-24">
            <input
              {...register('discount_amount', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="w-full px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-right"
            />
          </div>
        </div>
        <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
          <span className="font-bold text-stone-900">Total</span>
          <span className="text-xl font-bold text-emerald-600">R$ {finalAmount.toFixed(2)}</span>
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
          {isSubmitting ? 'Finalizando...' : 'Finalizar Venda'}
        </button>
      </div>
    </form>
  );
}
