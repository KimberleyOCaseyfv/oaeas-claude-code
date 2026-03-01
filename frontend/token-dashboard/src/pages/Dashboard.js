import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot, BarChart2, Award, Clock,
  ArrowUpRight, RefreshCw, Zap, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../App';

/* ─── helpers ──────────────────────────────────────────────── */
function getLevelClass(level) {
  const m = { Master: 'badge-master', Expert: 'badge-expert', Proficient: 'badge-proficient', Novice: 'badge-novice' };
  return m[level] || 'badge-novice';
}

function StatusDot({ status }) {
  const c = status === 'completed' ? '#00ff88' : status === 'running' ? '#2563eb' : status === 'failed' ? '#ef4444' : '#475569';
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${status === 'running' ? 'animate-pulse' : ''}`}
          style={{ background: c }} />
  );
}

/* ─── Stat card ────────────────────────────────────────────── */
function StatCard({ icon, label, value, trend, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-xl p-5"
      style={{ background: '#0d1117', border: `1px solid ${color}22` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: `${color}15` }}>
          {React.cloneElement(icon, { className: 'w-5 h-5', style: { color } })}
        </div>
        {trend != null && (
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#00ff88' }}>
            <ArrowUpRight className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white font-mono mb-1">{value ?? '—'}</div>
      <div className="text-xs" style={{ color: '#64748b' }}>{label}</div>
    </motion.div>
  );
}

/* ─── Chart tooltip ────────────────────────────────────────── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
         style={{ background: '#161b22', border: '1px solid #1e293b' }}>
      <p style={{ color: '#64748b' }}>{label}</p>
      <p className="font-bold mt-0.5" style={{ color: '#60a5fa' }}>{payload[0]?.value?.toFixed(0)} 分</p>
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────── */
function Skel({ h = 16 }) {
  return <div className="skeleton rounded-xl" style={{ height: h }} />;
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [rankRes, taskRes] = await Promise.allSettled([
        api.get('/api/v1/human/assessments?limit=20'),
        api.get('/rankings'),
      ]);
      const assessments = rankRes.status === 'fulfilled'
        ? (rankRes.value.data.data?.items || rankRes.value.data.data || [])
        : [];
      const rankings = taskRes.status === 'fulfilled'
        ? (taskRes.value.data.data?.items || taskRes.value.data.data || [])
        : [];

      const myBots = new Set(assessments.map(a => a.agent_id)).size;
      const completed = assessments.filter(a => a.status === 'completed');
      const avgScore = completed.length
        ? Math.round(completed.reduce((s, a) => s + (Number(a.total_score) || 0), 0) / completed.length)
        : 0;
      const masters = completed.filter(a => a.level === 'Master').length;

      // Chart data: last 8 completed assessments
      const chart = completed.slice(0, 8).reverse().map((a, i) => ({
        name: `#${i + 1}`,
        score: Number(a.total_score) || 0,
        agent: a.agent_name,
      }));

      setData({
        myBots, avgScore, masters,
        total: assessments.length,
        recent: assessments.slice(0, 8),
        chart,
        topAgents: rankings.slice(0, 3),
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">概览</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            {user?.email ? `欢迎回来，${user.email}` : '你好，开发者'}
          </p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="rounded-xl p-5 space-y-3" style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
              <Skel h={40} /> <Skel h={28} /> <Skel h={14} />
            </div>
          ))
        ) : (
          <>
            <StatCard icon={<Bot />}     label="已绑定 Bot 数"   value={data?.myBots}     color="#2563eb" delay={0} />
            <StatCard icon={<BarChart2 />} label="总测评次数"    value={data?.total}       color="#7c3aed" delay={0.05} />
            <StatCard icon={<Award />}   label="平均得分"       value={data?.avgScore}    color="#00ff88" delay={0.1} />
            <StatCard icon={<Clock />}   label="Master 级达成"  value={data?.masters}     color="#f59e0b" delay={0.15} />
          </>
        )}
      </div>

      {/* Chart + Top agents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 rounded-xl p-5"
             style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            最近测评分数趋势（我的 Bots）
          </h2>
          {loading ? (
            <Skel h={180} />
          ) : data?.chart?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1000]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2}
                      fill="url(#sg)" dot={{ fill: '#2563eb', r: 3 }} activeDot={{ r: 5, fill: '#60a5fa' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex flex-col items-center justify-center" style={{ color: '#334155' }}>
              <BarChart2 className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">暂无测评数据</p>
              <p className="text-xs mt-1" style={{ color: '#1e293b' }}>绑定 Bot 后，评测记录将在此显示</p>
            </div>
          )}
        </div>

        {/* Global Top 3 */}
        <div className="rounded-xl p-5" style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-4 h-4" style={{ color: '#f59e0b' }} />
            全球排行 TOP 3
          </h2>
          <div className="space-y-3">
            {loading ? (
              Array(3).fill(0).map((_, i) => <Skel key={i} h={52} />)
            ) : (
              (data?.topAgents || []).map((a, i) => (
                <div key={a.agent_name} className="flex items-center gap-3 p-3 rounded-lg"
                     style={{ background: '#161b22' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                       style={{
                         background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#b45309',
                         color: '#050810',
                       }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white truncate">{a.agent_name}</div>
                    <div className="text-xs" style={{ color: '#475569' }}>{a.agent_type}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-white font-mono">{Number(a.total_score).toFixed(0)}</div>
                    <span className={getLevelClass(a.level)}>{a.level}</span>
                  </div>
                </div>
              ))
            )}
            {!loading && !data?.topAgents?.length && (
              <p className="text-sm text-center py-4" style={{ color: '#334155' }}>暂无排名数据</p>
            )}
          </div>
          <Link to="/rankings" className="mt-4 flex items-center gap-1 text-xs"
                style={{ color: '#2563eb' }}>
            查看完整排行榜 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Recent assessments */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
        <div className="flex items-center justify-between px-5 py-4"
             style={{ background: '#0d1117', borderBottom: '1px solid #1e293b' }}>
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            我的 Bot 最近测评
          </h2>
          <Link to="/console/assessments" className="text-xs flex items-center gap-1" style={{ color: '#2563eb' }}>
            查看全部 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto" style={{ background: '#0d1117' }}>
          {loading ? (
            <div className="p-6 space-y-3">
              {Array(4).fill(0).map((_, i) => <Skel key={i} h={44} />)}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  {['Bot 名称', '任务代码', '状态', '总分', '等级'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider"
                        style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.recent || []).map((a, i) => (
                  <tr key={a.task_id || i}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid #0f172a' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-5 py-3 font-medium text-white">{a.agent_name || '—'}</td>
                    <td className="px-5 py-3">
                      <code className="text-xs px-2 py-0.5 rounded-md font-mono"
                            style={{ background: '#161b22', color: '#60a5fa' }}>
                        {a.task_code || '—'}
                      </code>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusDot status={a.status} />
                        <span className="text-xs capitalize" style={{ color: '#94a3b8' }}>{a.status || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-bold font-mono text-white">
                      {a.total_score != null ? Number(a.total_score).toFixed(0) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {a.level ? <span className={getLevelClass(a.level)}>{a.level}</span>
                               : <span style={{ color: '#334155' }}>—</span>}
                    </td>
                  </tr>
                ))}
                {!data?.recent?.length && (
                  <tr>
                    <td colSpan="5" className="px-5 py-10 text-center">
                      <Bot className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: '#475569' }} />
                      <p className="text-sm" style={{ color: '#475569' }}>
                        还没有测评记录，先去
                        <Link to="/console/bots" className="text-blue-400 hover:underline ml-1">绑定你的 Bot</Link>
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
