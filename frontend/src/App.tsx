import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  LogOut,
  Building2,
  UserCog,
  History,
  Menu,
  X,
  Tag,
  ShieldAlert,
  BadgeDollarSign,
  Layers3,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useCompanyContext } from './contexts/CompanyContext';
import { RoleGuard } from './guards/RoleGuard';
import { cn } from './lib/utils';

import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/operations/Agenda';
import Clients from './pages/operations/Clients';
import Sales from './pages/commercial/Sales';
import Products from './pages/inventory/Products';
import Services from './pages/operations/Services';
import Payables from './pages/finance/Payables';
import Receivables from './pages/finance/Receivables';
import Companies from './pages/admin/Companies';
import UsersAdmin from './pages/admin/Users';
import Plans from './pages/admin/Plans';
import Subscriptions from './pages/admin/Subscriptions';
import ActivityLogs from './pages/ActivityLogs';

function AccessBlockedPage() {
  const { accessBlockedReason, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200 p-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mx-auto mb-6">
          <ShieldAlert className="text-amber-700" size={30} />
        </div>
        <h1 className="text-2xl font-bold text-center text-stone-900 mb-3">Acesso bloqueado</h1>
        <p className="text-stone-600 text-center mb-6">{accessBlockedReason || 'Seu acesso não está liberado no momento.'}</p>
        <div className="space-y-3">
          <button onClick={signOut} className="w-full bg-stone-900 hover:bg-stone-800 text-white py-3 rounded-lg font-medium transition-colors">Sair</button>
          <p className="text-xs text-center text-stone-500">Entre em contato com o administrador responsável pelo sistema.</p>
        </div>
      </div>
    </div>
  );
}

function CompanySwitcher() {
  const { role } = useAuth();
  const { companies, activeCompanyId, setActiveCompanyId, loadingCompanies, plan } = useCompanyContext();
  if (role !== 'superadmin') {
    return (
      <div className="px-3 py-2 text-xs text-stone-500 border border-stone-800 rounded-lg">
        Plano: <span className="font-semibold text-stone-300">{plan.name}</span>
      </div>
    );
  }
  return (
    <div className="px-3 py-3 border-b border-stone-800 space-y-2">
      <div className="text-xs uppercase tracking-wider text-stone-500">Empresa em operação</div>
      <select
        value={activeCompanyId || ''}
        onChange={(e) => setActiveCompanyId(e.target.value || null)}
        className="w-full bg-stone-800 text-stone-100 rounded-lg px-3 py-2 text-sm outline-none"
      >
        <option value="">Selecione...</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>{company.name}</option>
        ))}
      </select>
      <div className="text-xs text-stone-500">{loadingCompanies ? 'Carregando empresas...' : `${companies.length} empresa(s)`}</div>
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, profile, signOut } = useAuth();
  const { plan } = useCompanyContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const isSaasOwner = role === 'superadmin';

  const menuItems = isSaasOwner ? [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Building2, label: 'Empresas', path: '/admin/companies' },
    { icon: Layers3, label: 'Planos', path: '/admin/plans' },
    { icon: BadgeDollarSign, label: 'Assinaturas', path: '/admin/subscriptions' },
    { icon: UserCog, label: 'Usuários', path: '/admin/users' },
    { icon: History, label: 'Logs', path: '/activity-logs' },
  ] : [
    plan.modules.dashboard ? { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' } : null,
    plan.modules.agenda ? { icon: Calendar, label: 'Agenda', path: '/operations/agenda' } : null,
    plan.modules.clients ? { icon: Users, label: 'Clientes', path: '/operations/clients' } : null,
    plan.modules.services ? { icon: Tag, label: 'Serviços', path: '/operations/services' } : null,
    plan.modules.sales ? { icon: ShoppingCart, label: 'Vendas', path: '/commercial/sales' } : null,
    plan.modules.sales ? { icon: Package, label: 'Estoque', path: '/inventory/products' } : null,
    plan.modules.finance ? { icon: DollarSign, label: 'Contas a Pagar', path: '/finance/payables' } : null,
    plan.modules.finance ? { icon: DollarSign, label: 'Contas a Receber', path: '/finance/receivables' } : null,
    plan.modules.users && role === 'admin' ? { icon: UserCog, label: 'Usuários', path: '/admin/users' } : null,
    { icon: History, label: 'Logs', path: '/activity-logs' },
  ].filter(Boolean) as { icon: any; label: string; path: string }[];

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900">
      <aside className="hidden md:flex flex-col w-72 bg-stone-900 text-stone-100">
        <div className="p-6 border-b border-stone-800">
          <h1 className="text-xl font-bold tracking-tight text-amber-400">Agenda Fácil Pro</h1>
          <p className="text-xs text-stone-500 mt-1">{isSaasOwner ? 'Painel SaaS' : `Plano ${plan.name}`}</p>
        </div>
        <CompanySwitcher />
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                location.pathname === item.path ? 'bg-amber-600 text-white' : 'hover:bg-stone-800 text-stone-400 hover:text-stone-100'
              )}
            >
              <item.icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-stone-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-stone-900">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-stone-500 truncate capitalize">{isSaasOwner ? 'global_admin' : role}</p>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center gap-3 w-full px-3 py-2 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors">
            <LogOut size={20} />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-stone-900 flex items-center justify-between px-4 z-50">
        <h1 className="text-lg font-bold text-amber-400">Agenda Fácil Pro</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-stone-100">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-stone-900 z-40 pt-20 p-4 overflow-y-auto">
          <div className="mb-4"><CompanySwitcher /></div>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg', location.pathname === item.path ? 'bg-amber-600 text-white' : 'text-stone-400')}>
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
            <button onClick={signOut} className="flex items-center gap-3 w-full px-4 py-3 text-red-400"><LogOut size={20} /><span className="font-medium">Sair</span></button>
          </nav>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0"><div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div></main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth/login" element={<Login />} />
      <Route path="/access-blocked" element={<AccessBlockedPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={<RoleGuard allowedRoles={['superadmin', 'admin', 'receptionist', 'professional', 'cashier']}><AppLayout><Dashboard /></AppLayout></RoleGuard>} />
      <Route path="/operations/agenda" element={<RoleGuard allowedRoles={['superadmin', 'admin', 'receptionist', 'professional']}><AppLayout><Agenda /></AppLayout></RoleGuard>} />
      <Route path="/operations/clients" element={<RoleGuard allowedRoles={['superadmin', 'admin', 'receptionist', 'professional']}><AppLayout><Clients /></AppLayout></RoleGuard>} />
      <Route path="/operations/services" element={<RoleGuard allowedRoles={['superadmin', 'admin', 'receptionist']}><AppLayout><Services /></AppLayout></RoleGuard>} />
      <Route path="/commercial/sales" element={<RoleGuard allowedRoles={['superadmin', 'admin', 'receptionist']}><AppLayout><Sales /></AppLayout></RoleGuard>} />
      <Route path="/inventory/products" element={<RoleGuard allowedRoles={['superadmin', 'admin', 'receptionist']}><AppLayout><Products /></AppLayout></RoleGuard>} />
      <Route path="/finance/payables" element={<RoleGuard allowedRoles={['superadmin', 'admin']}><AppLayout><Payables /></AppLayout></RoleGuard>} />
      <Route path="/finance/receivables" element={<RoleGuard allowedRoles={['superadmin', 'admin']}><AppLayout><Receivables /></AppLayout></RoleGuard>} />
      <Route path="/admin/companies" element={<RoleGuard allowedRoles={['superadmin']}><AppLayout><Companies /></AppLayout></RoleGuard>} />
      <Route path="/admin/plans" element={<RoleGuard allowedRoles={['superadmin']}><AppLayout><Plans /></AppLayout></RoleGuard>} />
      <Route path="/admin/subscriptions" element={<RoleGuard allowedRoles={['superadmin']}><AppLayout><Subscriptions /></AppLayout></RoleGuard>} />
      <Route path="/admin/users" element={<RoleGuard allowedRoles={['admin', 'superadmin']}><AppLayout><UsersAdmin /></AppLayout></RoleGuard>} />
      <Route path="/activity-logs" element={<RoleGuard allowedRoles={['superadmin', 'admin', 'receptionist', 'professional']}><AppLayout><ActivityLogs /></AppLayout></RoleGuard>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
