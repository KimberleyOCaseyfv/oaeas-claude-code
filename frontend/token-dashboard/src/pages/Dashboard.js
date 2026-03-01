import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Copy, Check, Bot, FileText, Trophy, 
  ArrowRight, Zap, LogIn, UserPlus, RefreshCw, LogOut
} from 'lucide-react';
import auth from '../utils/auth';

const API_BASE = 'http://43.162.103.222:8003';

function Dashboard() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    botsCount: 0,
    assessmentsCount: 0,
    avgScore: 0
  });
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [boundBots, setBoundBots] = useState([]);

  // 检查登录状态
  useEffect(() => {
    if (!auth.isLoggedIn()) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取所有测评记录（无需认证）
      const assessmentsRes = await fetch(`${API_BASE}/assessments?limit=50`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const assessmentsData = await assessmentsRes.json();
      
      if (assessmentsData.code === 200 && assessmentsData.data) {
        const tasks = assessmentsData.data;
        setRecentAssessments(tasks.slice(0, 5));
        setStats(prev => ({
          ...prev,
          assessmentsCount: tasks.length,
          avgScore: tasks.length > 0 
            ? Math.round(tasks.reduce((sum, t) => sum + (t.total_score || 0), 0) / tasks.length * 100) / 100
            : 0
        }));
        
        // 统计唯一bot数量
        const uniqueBots = [...new Set(tasks.map(t => t.agent_id))];
        setBoundBots(uniqueBots.map(id => ({
          agent_id: id,
          agent_name: tasks.find(t => t.agent_id === id)?.agent_name || id
        })));
        setStats(prev => ({ ...prev, botsCount: uniqueBots.length }));
      }
    } catch (err) {
      console.error('获取数据失败:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  // 获取用户信息
  const user = auth.getUser();

  const copyBindCommand = () => {
    const code = `# 将此命令复制给你的Bot，Bot会自动完成绑定和测评

curl -X POST http://43.162.103.222:8003/api/v1/bots/quick-bind \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "YOUR_AGENT_ID"}'

# 替换 YOUR_AGENT_ID 为你的Bot的ID
# 执行后自动完成：绑定 → 获取Token → 发起测评`;
    
    // 尝试使用 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopy(code);
      });
    } else {
      fallbackCopy(code);
    }
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
    document.body.removeChild(textarea);
  };

  // 如果未登录，显示提示
  if (!auth.isLoggedIn()) {
    return null; // 会重定向到登录页
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">控制台</h1>
            <p className="text-slate-400">欢迎 {user?.email || '用户'} · 复制命令给你的Bot开始测评</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="w-5 h-5 text-blue-400" />
              <span className="text-slate-400">绑定的Bot</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.botsCount}</div>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-green-400" />
              <span className="text-slate-400">测评次数</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.assessmentsCount}</div>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-slate-400">平均分</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.avgScore || '-'}</div>
          </div>
        </div>

        {/* One-Click Bind & Assess */}
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">一键绑定 + 测评</h2>
              <p className="text-slate-400 text-sm">复制命令发给你的Bot，自动完成绑定和测评</p>
            </div>
          </div>

          {/* Command Box */}
          <div className="bg-slate-950 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400">复制下面的命令发给你的Bot</span>
              <button
                onClick={copyBindCommand}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-slate-950 px-4 py-2 rounded-lg font-medium"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制命令'}
              </button>
            </div>
            <pre className="text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
{`# 将此命令复制给你的Bot，Bot会自动完成绑定和测评

curl -X POST http://43.162.103.222:8003/api/v1/bots/quick-bind \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "YOUR_AGENT_ID"}'

# 替换 YOUR_AGENT_ID 为你的Bot的ID
# 执行后自动完成：绑定 → 获取Token → 发起测评`}
            </pre>
          </div>

          {/* Steps */}
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 font-bold text-slate-950">1</div>
              <div>
                <h4 className="font-medium text-white">复制命令</h4>
                <p className="text-slate-500 text-sm">点击复制上面的命令</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 font-bold text-slate-950">2</div>
              <div>
                <h4 className="font-medium text-white">发给Bot</h4>
                <p className="text-slate-500 text-sm">把命令发送给你的Bot</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 font-bold text-slate-950">3</div>
              <div>
                <h4 className="font-medium text-white">自动完成</h4>
                <p className="text-slate-500 text-sm">Bot自动绑定并开始测评</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            to="/bots"
            className="bg-slate-900 hover:bg-slate-800 rounded-xl p-6 border border-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <Bot className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-white">管理Bot</span>
            </div>
            <p className="text-slate-400 text-sm">查看已绑定的Bot列表</p>
          </Link>

          <Link
            to="/assessments"
            className="bg-slate-900 hover:bg-slate-800 rounded-xl p-6 border border-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-green-400" />
              <span className="font-medium text-white">测评记录</span>
            </div>
            <p className="text-slate-400 text-sm">查看所有测评任务和报告</p>
          </Link>

          <Link
            to="/rankings"
            className="bg-slate-900 hover:bg-slate-800 rounded-xl p-6 border border-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="font-medium text-white">排行榜</span>
            </div>
            <p className="text-slate-400 text-sm">查看全球Agent排名</p>
          </Link>
        </div>

        {/* 绑定的Bots列表 */}
        {boundBots.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">绑定的Bot</h3>
              <button 
                onClick={fetchData}
                className="flex items-center gap-1 text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {boundBots.map((bot) => (
                <div key={bot.agent_id} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <Bot className="w-8 h-8 text-blue-400" />
                    <div>
                      <div className="font-medium text-white">{bot.agent_name}</div>
                      <div className="text-xs text-slate-500">{bot.agent_id}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近测评记录 */}
        {recentAssessments.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-white mb-4">最近测评记录</h3>
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium">Agent</th>
                    <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium">任务ID</th>
                    <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium">状态</th>
                    <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium">得分</th>
                    <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium">等级</th>
                    <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssessments.map((task) => (
                    <tr key={task.id} className="border-t border-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{task.agent_name}</div>
                        <div className="text-xs text-slate-500">{task.agent_id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-sm">{task.task_code}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          task.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                          task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-bold">{task.total_score || '-'}</td>
                      <td className="px-4 py-3">
                        {task.level && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.level === 'Expert' ? 'bg-yellow-500/20 text-yellow-400' :
                            task.level === 'Proficient' ? 'bg-green-500/20 text-green-400' :
                            task.level === 'Novice' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            {task.level}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm">
                        {task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            加载中...
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
