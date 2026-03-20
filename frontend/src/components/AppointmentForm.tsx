import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Appointment, Client, Professional, Service } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { format, addMinutes } from 'date-fns';

const appointmentSchema = z.object({
  client_id: z.string().min(1, 'Selecione um cliente'),
  professional_id: z.string().min(1, 'Selecione um profissional'),
  start_at: z.string().min(1, 'Selecione a data e hora'),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  services: z.array(z.object({
    service_id: z.string().min(1, 'Selecione um serviço'),
    price: z.number().min(0),
  })).min(1, 'Selecione pelo menos um serviço'),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  appointment?: Appointment;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AppointmentForm({ appointment, onSuccess, onCancel }: AppointmentFormProps) {
  const { companyUser } = useAuth();
  const companyId = useEffectiveCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: appointment ? {
      client_id: appointment.client_id,
      professional_id: appointment.professional_id,
      start_at: format(new Date(appointment.start_at), "yyyy-MM-dd'T'HH:mm"),
      status: appointment.status,
      services: appointment.services?.map(s => ({
        service_id: s.service_id,
        price: s.price,
      })) || [],
    } : {
      status: 'pending',
      services: [{ service_id: '', price: 0 }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "services"
  });

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  async function loadData() {
        if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      setLoading(true);
      const [clientsRes, profsRes, servicesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('company_id', companyId).is('deleted_at', null).order('full_name'),
        supabase.from('professionals').select('*, profile:profiles(*)').eq('company_id', companyId),
        supabase.from('services').select('*').eq('company_id', companyId).eq('status', 'active').order('name')
      ]);

      setClients(clientsRes.data || []);
      setProfessionals(profsRes.data || []);
      setServices(servicesRes.data || []);
    } catch (error) {
      console.error('Error loading form data:', error);
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: AppointmentFormData) => {
    if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      // Calculate end_at based on services duration
      const totalDuration = data.services.reduce((acc, s) => {
        const service = services.find(srv => srv.id === s.service_id);
        return acc + (service?.duration_minutes || 0);
      }, 0);

      const endAt = addMinutes(new Date(data.start_at), totalDuration).toISOString();

      if (appointment) {
        // Update appointment
        const { error: apptError } = await supabase
          .from('appointments')
          .update({
            client_id: data.client_id,
            professional_id: data.professional_id,
            start_at: new Date(data.start_at).toISOString(),
            end_at: endAt,
            status: data.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', appointment.id);
        
        if (apptError) throw apptError;

        // Update services (delete and re-insert)
        await supabase.from('appointment_services').delete().eq('appointment_id', appointment.id);
        const { error: servicesError } = await supabase
          .from('appointment_services')
          .insert(data.services.map(s => ({
            appointment_id: appointment.id,
            service_id: s.service_id,
            price: s.price,
          })));
        
        if (servicesError) throw servicesError;
      } else {
        // Create appointment
        const { data: newAppt, error: apptError } = await supabase
          .from('appointments')
          .insert([{
            company_id: companyId,
            client_id: data.client_id,
            professional_id: data.professional_id,
            start_at: new Date(data.start_at).toISOString(),
            end_at: endAt,
            status: data.status,
          }])
          .select()
          .single();
        
        if (apptError) throw apptError;

        // Insert services
        const { error: servicesError } = await supabase
          .from('appointment_services')
          .insert(data.services.map(s => ({
            appointment_id: newAppt.id,
            service_id: s.service_id,
            price: s.price,
          })));
        
        if (servicesError) throw servicesError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert('Erro ao salvar agendamento.');
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500">Carregando dados...</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
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

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-stone-700">Profissional *</label>
          <select
            {...register('professional_id')}
            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          >
            <option value="">Selecione um profissional...</option>
            {professionals.map(p => (
              <option key={p.id} value={p.id}>{p.profile?.full_name}</option>
            ))}
          </select>
          {errors.professional_id && <p className="text-xs text-red-500">{errors.professional_id.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-stone-700">Data e Hora *</label>
          <input
            {...register('start_at')}
            type="datetime-local"
            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
          {errors.start_at && <p className="text-xs text-red-500">{errors.start_at.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-stone-700">Status</label>
          <select
            {...register('status')}
            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          >
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-stone-700">Serviços *</label>
          <button
            type="button"
            onClick={() => append({ service_id: '', price: 0 })}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            + Adicionar Serviço
          </button>
        </div>
        
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
            <div className="flex-1 space-y-1.5">
              <select
                {...register(`services.${index}.service_id` as const)}
                onChange={(e) => {
                  const service = services.find(s => s.id === e.target.value);
                  if (service) {
                    setValue(`services.${index}.price`, service.price);
                  }
                }}
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="">Selecione um serviço...</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}min)</option>
                ))}
              </select>
            </div>
            <div className="w-24 space-y-1.5">
              <input
                {...register(`services.${index}.price` as const, { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Preço"
              />
            </div>
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-2 text-stone-400 hover:text-red-600 transition-colors"
              >
                Remover
              </button>
            )}
          </div>
        ))}
        {errors.services && <p className="text-xs text-red-500">{errors.services.message}</p>}
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
          {isSubmitting ? 'Salvando...' : appointment ? 'Atualizar Agendamento' : 'Agendar'}
        </button>
      </div>
    </form>
  );
}
