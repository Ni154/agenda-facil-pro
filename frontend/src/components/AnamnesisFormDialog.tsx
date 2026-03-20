import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { AnamnesisForm, AnamnesisAnswer, Client, Professional } from '../types';
import { Check, X, FileText, PenTool, Save, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import SignaturePad from './SignaturePad';

interface AnamnesisFormDialogProps {
  client: Client;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AnamnesisFormDialog({ client, onSuccess, onCancel }: AnamnesisFormDialogProps) {
  const { companyUser, user } = useAuth();
  const companyId = useEffectiveCompany();
  const [forms, setForms] = useState<AnamnesisForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<AnamnesisForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [step, setStep] = useState<'select' | 'fill' | 'sign'>('select');
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [signatureData, setSignatureData] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  async function loadData() {
        if (!companyId) { alert('Selecione uma empresa para continuar.'); return; }

    try {
      setLoading(true);
      const [formsRes, professionalsRes] = await Promise.all([
        supabase.from('anamnesis_forms').select('*').eq('company_id', companyId).eq('is_active', true),
        supabase.from('professionals').select('*, profile:profiles(full_name)').eq('company_id', companyId).eq('is_active', true)
      ]);

      setForms(formsRes.data || []);
      setProfessionals(professionalsRes.data || []);
    } catch (error) {
      console.error('Error loading anamnesis data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!selectedForm || !companyUser?.company_id) return;

    try {
      // 1. Save Anamnesis Answer
      const { data: newAnswer, error: answerError } = await supabase
        .from('anamnesis_answers')
        .insert([{
          client_id: client.id,
          form_id: selectedForm.id,
          answers_json: answers,
          professional_id: selectedProfessional || null,
        }])
        .select()
        .single();

      if (answerError) throw answerError;

      // 2. Save Digital Signature if provided
      if (signatureData) {
        const { error: signatureError } = await supabase
          .from('digital_signatures')
          .insert([{
            client_id: client.id,
            resource_type: 'anamnesis',
            resource_id: newAnswer.id,
            signature_data: signatureData,
          }]);
        
        if (signatureError) throw signatureError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving anamnesis:', error);
      alert('Erro ao salvar anamnese.');
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500">Carregando formulários...</div>;

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      {step === 'select' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-700">Selecione o Formulário</h3>
          <div className="grid grid-cols-1 gap-3">
            {forms.length === 0 ? (
              <p className="text-sm text-stone-500 italic text-center py-8">Nenhum formulário de anamnese ativo encontrado.</p>
            ) : (
              forms.map(form => (
                <button
                  key={form.id}
                  onClick={() => {
                    setSelectedForm(form);
                    setStep('fill');
                  }}
                  className="flex items-center justify-between p-4 bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-200 rounded-2xl transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-stone-400 group-hover:text-emerald-600 transition-colors shadow-sm">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-800">{form.title}</p>
                      <p className="text-xs text-stone-500">{form.description || 'Sem descrição'}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-stone-300 group-hover:text-emerald-500 transition-colors" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {step === 'fill' && selectedForm && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep('select')} className="text-xs font-bold text-stone-500 hover:text-stone-700 flex items-center gap-1">
              <ChevronLeft size={14} />
              Voltar
            </button>
            <h3 className="text-sm font-bold text-stone-700">{selectedForm.title}</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-stone-700">Profissional Responsável</label>
              <select
                value={selectedProfessional}
                onChange={(e) => setSelectedProfessional(e.target.value)}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="">Selecione um profissional...</option>
                {professionals.map(p => (
                  <option key={p.id} value={p.id}>{p.profile?.full_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4 pt-4 border-t border-stone-100">
              {selectedForm.fields_json.map((field: any) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-sm font-bold text-stone-700">{field.label} {field.required && '*'}</label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                    />
                  )}
                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {field.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {field.type === 'checkbox' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                        onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.checked })}
                      />
                      <span className="text-sm text-stone-600">Sim</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              onClick={() => setStep('sign')}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
            >
              <PenTool size={18} />
              Próximo: Assinatura
            </button>
          </div>
        </div>
      )}

      {step === 'sign' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep('fill')} className="text-xs font-bold text-stone-500 hover:text-stone-700 flex items-center gap-1">
              <ChevronLeft size={14} />
              Voltar para o formulário
            </button>
            <h3 className="text-sm font-bold text-stone-700">Assinatura Digital</h3>
          </div>

          <p className="text-sm text-stone-500">
            Ao assinar, o cliente confirma que as informações prestadas são verdadeiras.
          </p>

          <SignaturePad
            onSave={(data) => {
              setSignatureData(data);
              handleSave();
            }}
            onCancel={() => setStep('fill')}
          />
        </div>
      )}
    </div>
  );
}
