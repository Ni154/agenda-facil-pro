import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile, UserRole } from '../types';

const userSchema = z.object({
  email: z.string().email('E-mail inválido'),
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  role: z.enum(['admin', 'receptionist', 'professional', 'cashier']),
  status: z.enum(['active', 'inactive']),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: any; // Profile & { role: UserRole }
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const { companyUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: user ? {
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
    } : {
      status: 'active',
      role: 'professional',
    },
  });

  async function onSubmit(data: UserFormData) {
    const companyId = companyUser?.company_id;
    if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      if (user) {
        // Update existing user profile and company_user role
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: data.full_name })
          .eq('id', user.id);
        
        if (profileError) throw profileError;

        const { error: roleError } = await supabase
          .from('company_users')
          .update({ 
            role: data.role,
            status: data.status
          })
          .eq('profile_id', user.id)
          .eq('company_id', companyId);
        
        if (roleError) throw roleError;
      } else {
        // For new users, in a real app we would use Supabase Auth to invite them.
        // Here we'll simulate or just add to company_users if profile exists.
        // NOTE: This part is tricky without Auth Admin API. 
        // We'll assume for now we're just managing existing profiles in the company.
        alert('Funcionalidade de convite de novos usuários requer configuração de Auth Admin.');
        return;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Erro ao salvar usuário.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Nome Completo *</label>
        <input
          {...register('full_name')}
          className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Nome do colaborador"
        />
        {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">E-mail *</label>
        <input
          {...register('email')}
          type="email"
          disabled={!!user}
          className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-50 disabled:text-stone-400"
          placeholder="email@exemplo.com"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Perfil de Acesso *</label>
          <select
            {...register('role')}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="admin">Administrador</option>
            <option value="receptionist">Recepcionista</option>
            <option value="professional">Profissional</option>
            <option value="cashier">Caixa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
          <select
            {...register('status')}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
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
          {isSubmitting ? 'Salvando...' : user ? 'Atualizar Usuário' : 'Convidar Usuário'}
        </button>
      </div>
    </form>
  );
}
