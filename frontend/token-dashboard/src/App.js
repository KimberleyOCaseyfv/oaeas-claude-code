import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Zap, BarChart3, Trophy, FileText, PlusCircle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import TokenList from './pages/TokenList';
import CreateAssessment from './pages/CreateAssessment';
import ReportView from './pages/ReportView';
import Rankings from './pages/Rankings';

function App() {
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
              <nav className="flex space-x-4">
                <Link to="/" className="nav-link">
                  <BarChart3 className="w-4 h-4 inline mr-1" /> 概览
                </Link>
                <Link to="/tokens" className="nav-link">
                  <FileText className="w-4 h-4 inline mr-1" /> Tokens
                </Link>
                <Link to="/assess" className="nav-link">
                  <PlusCircle className="w-4 h-4 inline mr-1" /> 新建测评
                </Link>
                <Link to="/rankings" className="nav-link">
                  <Trophy className="w-4 h-4 inline mr-1" /> 排行榜
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tokens" element={<TokenList />} />
            <Route path="/assess" element={<CreateAssessment />} />
            <Route path="/reports/:reportCode" element={<ReportView />} />
            <Route path="/rankings" element={<Rankings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
