import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Users, TrendingUp, Award, Clock,
  ArrowUpRight, Zap, BarChart2, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../services/api';

/* ─── helpers ─────────────────────────────────────────────── */
function getLevelClass(level) {
  const map = {
    Master: 'badge-master',
    Expert: 'badge-expert',
    Proficient: 'badge-proficient',
    Novice: 'badge-novice',
  };
  return map[level] || 'badge-novice';
}

function StatusDot({ status }) {
  const color =
    status === 'completed' ? 'bg-green-400' :
    status === 'running'   ? 'bg-blue-400 animate-pulse' :
    status === 'failed'    ? 'bg-red-400' :
    'bg-slate-500';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

/* ─── Skeleton ─────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="skeleton w-12 h-4 rounded" />
      </div>
      <div className="skeleton w-20 h-8 rounded" />
      <div className="skeleton w-24 h-3 rounded" />
    </div>
  );
}

/* ─── StatCard ─────────────────────────────────────────────── */
function StatCard({ icon, title, value, trend, sub, accent }) {
  const accentMap = {
    blue:   'from-blue-500/20 to-blue-500/5 border-blue-500/20',
    green:  'from-green-500/20 to-green-500/5 border-green-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20',
  };
  const iconMap = {
    blue:   'bg-blue-500/20 text-blue-400',
    green:  'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };
  return (
    <div className={`card bg-gradient-to-br ${accentMap[accent] || accentMap.blue} p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconMap[accent] || iconMap.blue}`}>
          {icon}
        </div>
        {trend != null && (
          <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
            <ArrowUpRight className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value ?? '—'}</div>
      <div className="text-sm text-slate-400">{title}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

/* ─── Custom tooltip ───────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-blue-400">{payload[0]?.value?.toFixed(1)} 分</p>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [rankRes, taskRes, tokenRes] = await Promise.allSettled([
        api.get('/rankings'),
        api.get('/api/v1/tasks?limit=10'),
        api.get('/tokens'),
      ]);

      const rankings   = rankRes.status   === 'fulfilled' ? (rankRes.value.data.data   || []) : [];
      const tasks      = taskRes.status   === 'fulfilled' ? (taskRes.value.data.data   || []) : [];
      const tokens     = tokenRes.status  === 'fulfilled' ? (tokenRes.value.data.data  || []) : [];
      const active     = tokens.filter(t => t.status === 'active').length;
      const masterCnt  = rankings.filter(r => r.level === 'Master').length;
      const avgScore   = rankings.length
        ? (rankings.reduce((s, r) => s + r.total_score, 0) / rankings.length).toFixed(1)
        : 0;

      setStats({
        totalAssessments: tasks.length,
        activeTokens: active,
        avgScore,
        masterCount: masterCnt,
        topAgents: rankings.slice(0, 3),
      });
      setRecentAssessments(tasks.slice(0, 6));

      // Build chart data from tasks (last 7 days trend or just the latest tasks)
      const completed = tasks.filter(t => t.total_score != null).slice(0, 7).reverse();
      setChartData(completed.map((t, i) => ({
        name: `#${i + 1}`,
        score: Number(t.total_score),
        agent: t.agent_name,
      })));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-6 h-64 skeleton" />
          <div className="card p-6 h-64 skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">数据概览</h1>
          <p className="text-sm text-slate-500 mt-0.5">Agent 测评平台实时数据</p>
        </div>
        <button
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="btn-secondary text-sm py-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          accent="blue"
          icon={<Activity className="w-5 h-5" />}
          title="总测评数"
          value={stats?.totalAssessments}
          trend="+12%"
          sub="本周新增 3 次"
        />
        <StatCard
          accent="green"
          icon={<Users className="w-5 h-5" />}
          title="活跃 Tokens"
          value={stats?.activeTokens}
          sub="可用评测凭证"
        />
        <StatCard
          accent="purple"
          icon={<TrendingUp className="w-5 h-5" />}
          title="平均得分"
          value={stats?.avgScore ? `${stats.avgScore}` : '—'}
          sub="/ 1000 满分"
        />
        <StatCard
          accent="yellow"
          icon={<Award className="w-5 h-5" />}
          title="Master 级 Agent"
          value={stats?.masterCount}
          sub="顶尖能力等级"
        />
      </div>

      {/* Charts + Top Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Trend Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-400" />
              最近测评分数趋势
            </h2>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1000]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6, fill: '#60a5fa' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-500">
              <BarChart2 className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">暂无测评数据</p>
              <Link to="/assess" className="mt-3 text-blue-400 hover:text-blue-300 text-xs underline">
                发起第一次测评 →
              </Link>
            </div>
          )}
        </div>

        {/* Top 3 Agents */}
        <div className="card p-6">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-yellow-400" />
            排行榜 TOP 3
          </h2>
          <div className="space-y-3">
            {stats?.topAgents?.map((agent, i) => (
              <div
                key={agent.agent_name}
                className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  i === 0 ? 'bg-yellow-400 text-slate-900' :
                  i === 1 ? 'bg-slate-300 text-slate-900' :
                  'bg-amber-600 text-white'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-white truncate">{agent.agent_name}</div>
                  <div className="text-xs text-slate-500 capitalize">{agent.agent_type}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-white">{Number(agent.total_score).toFixed(0)}</div>
                  <span className={getLevelClass(agent.level)}>{agent.level}</span>
                </div>
              </div>
            ))}
            {(!stats?.topAgents || stats.topAgents.length === 0) && (
              <div className="text-center text-slate-500 py-8 text-sm">暂无排名数据</div>
            )}
          </div>
          <Link
            to="/rankings"
            className="mt-4 text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
          >
            查看完整排行榜 <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Recent Assessments */}
      <div className="card">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            最近测评记录
          </h2>
          <Link to="/assess" className="btn-primary text-sm py-2">
            <Zap className="w-4 h-4" /> 新建测评
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-slate-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">任务代码</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">总分</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">等级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentAssessments.map((a) => (
                <tr key={a.task_id || a.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-3">
                    <div className="font-medium text-white">{a.agent_name || '—'}</div>
                  </td>
                  <td className="px-6 py-3">
                    <code className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                      {a.task_code || '—'}
                    </code>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <StatusDot status={a.status} />
                      <span className="text-sm text-slate-400 capitalize">{a.status || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-white">
                    {a.total_score != null ? Number(a.total_score).toFixed(0) : '—'}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {a.level
                      ? <span className={getLevelClass(a.level)}>{a.level}</span>
                      : <span className="text-slate-600 text-xs">—</span>
                    }
                  </td>
                </tr>
              ))}
              {recentAssessments.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                    暂无测评记录，
                    <Link to="/assess" className="text-blue-400 hover:underline ml-1">立即发起测评</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
