const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email, password, full_name, company_id, role } = JSON.parse(event.body || '{}');
    if (!email || !password || !full_name || !company_id || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados obrigatórios ausentes.' }) };
    }

    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Variáveis do Supabase não configuradas.' }) };
    }

    const admin = createClient(url, serviceKey);

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (authError) throw authError;

    const userId = created.user.id;

    const { error: profileError } = await admin.from('profiles').upsert([{ id: userId, full_name }]);
    if (profileError) throw profileError;

    const { error: linkError } = await admin.from('company_users').insert([{ profile_id: userId, company_id, role, status: 'active' }]);
    if (linkError) throw linkError;

    return { statusCode: 200, body: JSON.stringify({ ok: true, id: userId }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Erro interno' }) };
  }
};
