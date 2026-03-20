import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LogIn, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      navigate('/dashboard', { replace: true });
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Informe seu e-mail para enviar o link de redefinição de senha.');
      return;
    }

    try {
      setResetLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/login`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccessMessage('Enviamos um link de redefinição de senha para seu e-mail.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar o link de redefinição.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
        <div className="p-8 bg-stone-900 text-center">
          <h1 className="text-3xl font-bold text-amber-400 tracking-tight">Agenda Fácil Pro</h1>
          <p className="text-stone-300 mt-2">
            Acesso liberado apenas para usuários cadastrados pela administração
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Senha</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={20} />
                  Entrar no Sistema
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="w-full flex items-center justify-center gap-2 text-sm text-stone-600 hover:text-amber-700 transition-colors disabled:opacity-50"
            >
              {resetLoading ? (
                <div className="w-4 h-4 border-2 border-stone-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <KeyRound size={16} />
              )}
              Esqueci minha senha
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-stone-500">
              Empresas e usuários são cadastrados pela administração do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
