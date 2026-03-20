import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [name, setName] = useState('');

  async function load() {
    const { data } = await supabase.from('companies').select('*');
    setCompanies(data || []);
  }

  async function createCompany() {
    if (!name) return alert('Nome obrigatório');

    const { data, error } = await supabase
      .from('companies')
      .insert([{ name, status: 'active' }])
      .select()
      .single();

    if (error) return alert(error.message);

    setName('');
    load();
  }

  async function toggleStatus(id: string, status: string) {
    await supabase
      .from('companies')
      .update({ status: status === 'active' ? 'inactive' : 'active' })
      .eq('id', id);

    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Empresas</h1>

      <div className="flex gap-2">
        <input
          className="border p-2 rounded"
          placeholder="Nome da empresa"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={createCompany} className="bg-amber-600 text-white px-4 rounded">
          Criar
        </button>
      </div>

      <div className="space-y-2">
        {companies.map((c) => (
          <div key={c.id} className="border p-3 flex justify-between">
            <span>{c.name}</span>
            <button
              onClick={() => toggleStatus(c.id, c.status)}
              className="text-sm text-red-600"
            >
              {c.status === 'active' ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
