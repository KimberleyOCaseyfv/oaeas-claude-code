import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Zap, BarChart3, Trophy, Home, LogIn, UserPlus, LogOut } from 'lucide-react';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import ReportView from './pages/ReportView';
import Rankings from './pages/Rankings';
import Register from './pages/Register';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import auth from './utils/auth';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(auth.isLoggedIn());

  useEffect(() => {
    const checkAuth = () => setIsLoggedIn(auth.isLoggedIn());
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleLogout = () => {
    auth.logout();
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <Zap className="w-8 h-8 text-yellow-400" />
                <span className="text-xl font-bold">OAEAS</span>
              </div>
              <nav className="flex items-center gap-4">
                <Link to="/" className="nav-link">
                  <Home className="w-4 h-4 inline mr-1" /> 首页
                </Link>
                {isLoggedIn ? (
                  <>
                    <Link to="/dashboard" className="nav-link">
                      <BarChart3 className="w-4 h-4 inline mr-1" /> 控制台
                    </Link>
                    <button onClick={handleLogout} className="nav-link flex items-center gap-1">
                      <LogOut className="w-4 h-4" /> 退出
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="nav-link flex items-center gap-1">
                      <LogIn className="w-4 h-4" /> 登录
                    </Link>
                    <Link to="/register" className="nav-link flex items-center gap-1">
                      <UserPlus className="w-4 h-4" /> 注册
                    </Link>
                  </>
                )}
                <Link to="/rankings" className="nav-link">
                  <Trophy className="w-4 h-4 inline mr-1" /> 排行
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/reports/:reportCode" element={
              <ProtectedRoute>
                <ReportView />
              </ProtectedRoute>
            } />
            <Route path="/rankings" element={<Rankings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
