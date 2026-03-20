import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectiveCompany } from '../../hooks/useEffectiveCompany';
import { Appointment, Professional } from '../../types';
import { cn } from '../../lib/utils';
import Modal from '../../components/Modal';
import AppointmentForm from '../../components/AppointmentForm';

import SaleForm from '../../components/SaleForm';

export default function Agenda() {
  const { companyUser } = useAuth();
  const companyId = useEffectiveCompany();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>(undefined);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyUser, currentDate, view]);

  async function loadData() {
        if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      setLoading(true);
      const [appts, profs] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, client:clients(*), professional:professionals(*, profile:profiles(*)), services:appointment_services(*, service:services(*))')
          .eq('company_id', companyId)
          .gte('start_at', startOfMonth(currentDate).toISOString())
          .lte('start_at', endOfMonth(currentDate).toISOString()),
        supabase
          .from('professionals')
          .select('*, profile:profiles(*)')
          .eq('company_id', companyId)
      ]);

      setAppointments(appts.data || []);
      setProfessionals(profs.data || []);
    } catch (error) {
      console.error('Error loading agenda data:', error);
    } finally {
      setLoading(false);
    }
  }

  const days = view === 'week' 
    ? eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), 6) })
    : eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Agenda</h1>
          <p className="text-stone-500">Gerencie seus horários e atendimentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-lg border border-stone-200 p-1 flex">
            <button 
              onClick={() => setView('day')}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", view === 'day' ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50")}
            >
              Dia
            </button>
            <button 
              onClick={() => setView('week')}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", view === 'week' ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50")}
            >
              Semana
            </button>
            <button 
              onClick={() => setView('month')}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", view === 'month' ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50")}
            >
              Mês
            </button>
          </div>
          <button 
            onClick={() => {
              setSelectedAppointment(undefined);
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors"
          >
            <Plus size={18} />
            Novo Agendamento
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-stone-800 capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-1.5 hover:bg-stone-100 rounded-full transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-xs font-medium hover:bg-stone-100 rounded-md transition-colors"
              >
                Hoje
              </button>
              <button 
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-1.5 hover:bg-stone-100 rounded-full transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar agendamento..." 
              className="pl-10 pr-4 py-2 bg-stone-50 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 w-64"
            />
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className={cn(
            "grid min-w-[800px]",
            view === 'week' ? "grid-cols-7" : "grid-cols-7"
          )}>
            {/* Weekday Headers */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-4 text-center text-xs font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                {day}
              </div>
            ))}

            {/* Days */}
            {days.map((day, idx) => {
              const dayAppointments = appointments.filter(a => isSameDay(new Date(a.start_at), day));
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "min-h-[150px] p-2 border-r border-b border-stone-50 last:border-r-0",
                    !isSameDay(day, new Date()) && "bg-white",
                    isSameDay(day, new Date()) && "bg-emerald-50/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                      isSameDay(day, new Date()) ? "bg-emerald-600 text-white" : "text-stone-700"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.map(appt => (
                      <div 
                        key={appt.id}
                        onClick={() => {
                          setSelectedAppointment(appt);
                          setIsModalOpen(true);
                        }}
                        className={cn(
                          "p-1.5 rounded-md text-[10px] font-medium border-l-4 shadow-sm cursor-pointer hover:brightness-95 transition-all",
                          appt.status === 'completed' ? "bg-emerald-100 text-emerald-800 border-emerald-500" :
                          appt.status === 'pending' ? "bg-amber-100 text-amber-800 border-amber-500" :
                          appt.status === 'confirmed' ? "bg-blue-100 text-blue-800 border-blue-500" :
                          "bg-stone-100 text-stone-800 border-stone-500"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{format(new Date(appt.start_at), 'HH:mm')}</span>
                          <span className="truncate opacity-70">{appt.client?.full_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl border border-stone-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-xs font-medium text-stone-600">Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs font-medium text-stone-600">Confirmado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-xs font-medium text-stone-600">Concluído</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-stone-500"></div>
          <span className="text-xs font-medium text-stone-600">Cancelado</span>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
      >
        <AppointmentForm
          appointment={selectedAppointment}
          onSuccess={() => {
            setIsModalOpen(false);
            loadData();
          }}
          onCancel={() => setIsModalOpen(false)}
          onInvoice={(appt) => {
            setIsModalOpen(false);
            setSelectedAppointment(appt);
            setIsSaleModalOpen(true);
          }}
        />
      </Modal>

      {isSaleModalOpen && selectedAppointment && (
        <Modal
          isOpen={isSaleModalOpen}
          onClose={() => setIsSaleModalOpen(false)}
          title="Faturar Agendamento"
        >
          <SaleForm
            initialAppointmentId={selectedAppointment.id}
            initialClientId={selectedAppointment.client_id}
            initialItems={selectedAppointment.services?.map(s => ({
              product_id: null,
              service_id: s.service_id,
              quantity: 1,
              unit_price: s.price
            }))}
            onSuccess={() => {
              setIsSaleModalOpen(false);
              loadData();
            }}
            onCancel={() => setIsSaleModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
