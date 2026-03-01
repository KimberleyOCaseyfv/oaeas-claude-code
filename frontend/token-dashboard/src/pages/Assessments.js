import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search, RefreshCw, ChevronRight, Filter, ExternalLink } from 'lucide-react';
import api from '../services/api';

/* ─── helpers ──────────────────────────────────────────────── */
function getLevelClass(level) {
  const m = { Master: 'badge-master', Expert: 'badge-expert', Proficient: 'badge-proficient', Novice: 'badge-novice' };
  return m[level] || 'badge-novice';
}

function StatusBadge({ status }) {
  const map = {
    completed: { label: '完成', color: '#00ff88',  bg: 'rgba(0,255,136,0.1)' },
    running:   { label: '进行中', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    failed:    { label: '失败',  color: '#ef4444',  bg: 'rgba(239,68,68,0.1)' },
    aborted:   { label: '已终止', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    pending:   { label: '排队',  color: '#64748b',  bg: 'rgba(100,116,139,0.1)' },
  };
  const s = map[status] || map.pending;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{ color: s.color, background: s.bg }}>
      {status === 'running' && <span className="w-1.5 h-1.5 rounded-full mr-1 animate-pulse" style={{ background: s.color }} />}
      {s.label}
    </span>
  );
}

function ScoreBar({ score, max = 1000 }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 85 ? '#f59e0b' : pct >= 70 ? '#7c3aed' : pct >= 50 ? '#2563eb' : '#64748b';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-bold font-mono text-white w-10 text-right">{score.toFixed(0)}</span>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function Assessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/api/v1/human/assessments', { params });
      const d = res.data.data;
      setAssessments(d?.items || d || []);
      setTotal(d?.total || 0);
    } catch {
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = assessments.filter(a =>
    !search ||
    a.agent_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.task_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">测评记录</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            我的 Bots 的所有评测历史 · 共 {total} 条
          </p>
        </div>
        <button onClick={fetchData} disabled={loading} className="btn-secondary py-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
          <input className="form-input pl-9 text-sm"
                 placeholder="搜索 Agent 名称或任务代码…"
                 value={search}
                 onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {[
            { v: 'all', label: '全部' },
            { v: 'completed', label: '已完成' },
            { v: 'running', label: '进行中' },
            { v: 'failed', label: '失败/终止' },
          ].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => { setStatusFilter(v); setPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={
                statusFilter === v
                  ? { background: '#2563eb', color: '#fff' }
                  : { background: '#161b22', color: '#64748b', border: '1px solid #1e293b' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
        {loading ? (
          <div className="p-8 text-center" style={{ background: '#0d1117' }}>
            <div className="w-7 h-7 spinner mx-auto mb-2" />
            <p className="text-sm" style={{ color: '#475569' }}>加载中…</p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ background: '#0d1117' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  {['Agent', '任务代码', '协议', '状态', '分数', '等级', '时间', '报告'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                        style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.task_id || i} style={{ borderBottom: '1px solid #0f172a' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white text-sm">{a.agent_name || '—'}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{a.agent_id || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs px-2 py-0.5 rounded font-mono"
                            style={{ background: '#161b22', color: '#60a5fa' }}>
                        {a.task_code || '—'}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded"
                            style={{ background: '#161b22', color: '#94a3b8', border: '1px solid #1e293b' }}>
                        {a.agent_protocol || a.protocol || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3">
                      {a.total_score != null
                        ? <ScoreBar score={Number(a.total_score)} />
                        : <span style={{ color: '#334155' }}>—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {a.level
                        ? <span className={getLevelClass(a.level)}>{a.level}</span>
                        : <span style={{ color: '#334155' }}>—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleString('zh-CN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.report_code ? (
                        <Link to={`/reports/${a.report_code}`}
                              className="flex items-center gap-1 text-xs"
                              style={{ color: '#2563eb' }}>
                          查看 <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : a.status === 'completed' ? (
                        <span className="text-xs" style={{ color: '#334155' }}>生成中</span>
                      ) : (
                        <span className="text-xs" style={{ color: '#1e293b' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center">
                      <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: '#475569' }} />
                      <p className="text-sm" style={{ color: '#475569' }}>
                        {search || statusFilter !== 'all'
                          ? '没有匹配的测评记录'
                          : 'Bot 发起自主测评后，记录将在此显示'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 text-xs border-t"
               style={{ borderColor: '#1e293b', background: '#0d1117', color: '#475569' }}>
            <span>第 {page} 页 / 共 {Math.ceil(total / PAGE_SIZE)} 页</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1} className="btn-secondary py-1 px-2 text-xs">
                上一页
              </button>
              <button onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(total / PAGE_SIZE)}
                      className="btn-secondary py-1 px-2 text-xs">
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="rounded-xl p-4 text-xs" style={{ background: '#0d1117', border: '1px solid #1e293b', color: '#475569' }}>
        <strong className="text-white">提示：</strong>
        Bot 通过调用 API（<code className="text-blue-400">POST /api/v1/tasks</code>）自主发起测评，
        完成后记录自动出现在此列表。你无需手动创建任何测评。
      </div>
    </div>
  );
}
