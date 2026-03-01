import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Link, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  Zap, LayoutDashboard, Bot, ClipboardList, Trophy,
  LogOut, Menu, X, ChevronRight, Settings
} from 'lucide-react';

// Pages – Public
import Home     from './pages/Home';
import Rankings from './pages/Rankings';
import ReportView from './pages/ReportView';
// Pages – Console (Human)
import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import Bots        from './pages/Bots';
import Assessments from './pages/Assessments';
// Pages – Admin
import AdminPayments from './pages/AdminPayments';

/* ─── Auth context (localStorage-based for simplicity) ────── */
const AuthCtx = createContext(null);
export function useAuth() { return useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [jwt, setJwt] = useState(() => localStorage.getItem('human_jwt'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('human_user')); } catch { return null; }
  });

  function login(token, userObj) {
    localStorage.setItem('human_jwt', token);
    localStorage.setItem('human_user', JSON.stringify(userObj));
    setJwt(token);
    setUser(userObj);
  }

  function logout() {
    localStorage.removeItem('human_jwt');
    localStorage.removeItem('human_user');
    setJwt(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ jwt, user, login, logout, isAuth: !!jwt }}>
      {children}
    </AuthCtx.Provider>
  );
}

/* ─── Guard ────────────────────────────────────────────────── */
function RequireAuth({ children }) {
  const { isAuth } = useAuth();
  const location = useLocation();
  if (!isAuth) return <Navigate to="/console/login" state={{ from: location }} replace />;
  return children;
}

/* ─── Public top-nav ─────────────────────────────────────── */
function PublicNav() {
  const { isAuth } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
         style={{ background: 'rgba(5,8,16,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e293b' }}>
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold tracking-wide text-white">OAEAS</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link to="/rankings" className="btn-ghost text-sm py-1.5 px-3">
          <Trophy className="w-4 h-4" /> 排行榜
        </Link>
        {isAuth ? (
          <Link to="/console/dashboard" className="btn-primary text-sm py-1.5 px-4">
            进入控制台
          </Link>
        ) : (
          <Link to="/console/login" className="btn-primary text-sm py-1.5 px-4">
            登录控制台
          </Link>
        )}
      </div>
    </nav>
  );
}

/* ─── Console sidebar layout ─────────────────────────────── */
const CONSOLE_NAV = [
  { to: '/console/dashboard',   icon: LayoutDashboard, label: '概览' },
  { to: '/console/bots',        icon: Bot,              label: 'Bot 管理' },
  { to: '/console/assessments', icon: ClipboardList,    label: '测评记录' },
];

function ConsoleSidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={onClose} />
      )}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 flex flex-col
        transform transition-transform duration-300
        lg:relative lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ background: 'var(--color-bg-surface)', borderRight: '1px solid var(--color-border)' }}>

        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">OAEAS 控制台</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Agent 评测平台</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {CONSOLE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'text-white'
                    : 'hover:text-white'
                }`
              }
              style={({ isActive }) => isActive
                ? { background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)' }
                : { color: 'var(--color-text-muted)', border: '1px solid transparent' }
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-blue-400" />}
                </>
              )}
            </NavLink>
          ))}

          <div className="pt-3 border-t mt-3" style={{ borderColor: 'var(--color-border)' }}>
            <Link to="/rankings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
              onClick={onClose}
            >
              <Trophy className="w-4 h-4 shrink-0" /> 排行榜
            </Link>
          </div>
        </nav>

        {/* User footer */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
               style={{ background: 'var(--color-bg-elevated)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                 style={{ background: 'rgba(37,99,235,0.2)', color: '#60a5fa' }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{user?.email || '已登录'}</div>
            </div>
            <button onClick={logout} className="btn-ghost p-1.5 rounded-lg text-red-400 hover:text-red-300"
                    title="退出登录">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function ConsoleLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg-void)' }}>
      <ConsoleSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
                style={{ background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white p-1.5 rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-white text-sm">OAEAS 控制台</span>
          </div>
          <div className="w-8" />
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ─── App ────────────────────────────────────────────────── */
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-elevated)',
              color: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              fontSize: '13px',
            }
          }}
        />
        <Routes>
          {/* ── Public ─────────────────────────────────── */}
          <Route path="/" element={
            <div style={{ background: 'var(--color-bg-void)' }}>
              <PublicNav />
              <Home />
            </div>
          } />
          <Route path="/rankings" element={
            <div style={{ background: 'var(--color-bg-void)', minHeight: '100vh' }}>
              <PublicNav />
              <div className="pt-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-10">
                <Rankings />
              </div>
            </div>
          } />
          <Route path="/reports/:reportCode" element={
            <div style={{ background: 'var(--color-bg-void)', minHeight: '100vh' }}>
              <PublicNav />
              <div className="pt-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-10">
                <ReportView />
              </div>
            </div>
          } />

          {/* ── Login ──────────────────────────────────── */}
          <Route path="/console/login" element={<Login />} />

          {/* ── Console (auth required) ─────────────────── */}
          <Route path="/console" element={<Navigate to="/console/dashboard" replace />} />
          <Route path="/console/dashboard" element={
            <RequireAuth>
              <ConsoleLayout><Dashboard /></ConsoleLayout>
            </RequireAuth>
          } />
          <Route path="/console/bots" element={
            <RequireAuth>
              <ConsoleLayout><Bots /></ConsoleLayout>
            </RequireAuth>
          } />
          <Route path="/console/assessments" element={
            <RequireAuth>
              <ConsoleLayout><Assessments /></ConsoleLayout>
            </RequireAuth>
          } />

          {/* ── Admin ──────────────────────────────────── */}
          <Route path="/admin/payments" element={
            <ConsoleLayout><AdminPayments /></ConsoleLayout>
          } />

          {/* ── Fallback ───────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
