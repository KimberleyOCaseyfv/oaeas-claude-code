import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import {
  Zap, BarChart3, Trophy, FileText, PlusCircle, CreditCard, Menu, X, ChevronRight
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import TokenList from './pages/TokenList';
import CreateAssessment from './pages/CreateAssessment';
import ReportView from './pages/ReportView';
import Rankings from './pages/Rankings';
import AdminPayments from './pages/AdminPayments';

const navItems = [
  { to: '/', icon: BarChart3, label: '数据概览', end: true },
  { to: '/tokens', icon: FileText, label: '测评 Tokens' },
  { to: '/assess', icon: PlusCircle, label: '新建测评' },
  { to: '/rankings', icon: Trophy, label: '全球排行榜' },
  { to: '/admin/payments', icon: CreditCard, label: '支付管理' },
];

function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800
          flex flex-col transform transition-transform duration-300
          lg:relative lg:translate-x-0 lg:flex
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-wide">OAEAS</div>
              <div className="text-xs text-slate-500">Agent 能力评测平台</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium group ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="px-4 py-3 bg-slate-800/60 rounded-xl">
            <div className="text-xs text-slate-500 leading-relaxed">
              <span className="text-slate-400 font-medium">OpenClaw Agent Benchmark</span>
              <br />
              版本 v1.0.0 · 2026
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-30">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              <span className="font-bold">OAEAS</span>
            </div>
            <div className="w-9" />
          </header>

          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tokens" element={<TokenList />} />
              <Route path="/assess" element={<CreateAssessment />} />
              <Route path="/reports/:reportCode" element={<ReportView />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
