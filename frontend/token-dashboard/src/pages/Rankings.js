import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award, RefreshCw, Search, ChevronDown, Crown, Zap } from 'lucide-react';
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

const TYPE_LABELS = {
  general:   '通用型',
  coding:    '代码型',
  creative:  '创意型',
  openai:    'OpenAI',
  anthropic: 'Anthropic',
};

/* ─── Podium ───────────────────────────────────────────────── */
function Podium({ agents }) {
  if (!agents || agents.length === 0) return null;
  const [first, second, third] = agents;

  const card = (agent, pos) => {
    if (!agent) return <div className="flex-1" />;
    const styles = {
      1: { ringColor: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.1)',  icon: <Crown className="w-6 h-6" style={{ color: '#f59e0b' }} />, h: 128, medalBg: '#f59e0b', medalText: '#1a1a1a' },
      2: { ringColor: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.08)', icon: <Medal className="w-5 h-5" style={{ color: '#94a3b8' }} />, h: 96, medalBg: '#94a3b8', medalText: '#1a1a1a' },
      3: { ringColor: 'rgba(180,120,60,0.3)',  bg: 'rgba(180,120,60,0.08)',  icon: <Award className="w-5 h-5" style={{ color: '#b47c3c' }} />, h: 80,  medalBg: '#b47c3c', medalText: '#fff' },
    }[pos];

    return (
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg"
             style={{ background: styles.medalBg, color: styles.medalText }}>
          {pos}
        </div>
        <div className="w-full rounded-xl p-3 text-center flex flex-col justify-center"
             style={{ background: styles.bg, border: `1px solid ${styles.ringColor}`, minHeight: styles.h }}>
          <div className="flex items-center justify-center gap-1 mb-1">{styles.icon}</div>
          <div className="font-bold text-white text-sm truncate px-1">{agent.agent_name}</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {Number(agent.total_score).toFixed(0)}
          </div>
          <span className={`${getLevelClass(agent.level)} mt-1`}>{agent.level}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-end gap-3 sm:gap-4 px-4">
      {card(second, 2)}
      {card(first, 1)}
      {card(third, 3)}
    </div>
  );
}

/* ─── Rank icon ────────────────────────────────────────────── */
function RankIcon({ rank }) {
  if (rank === 1) return <Trophy className="w-5 h-5" style={{ color: '#f59e0b' }} />;
  if (rank === 2) return <Medal className="w-5 h-5" style={{ color: '#94a3b8' }} />;
  if (rank === 3) return <Award className="w-5 h-5" style={{ color: '#b47c3c' }} />;
  return <span className="w-5 text-center text-sm font-bold" style={{ color: '#475569' }}>{rank}</span>;
}

/* ─── Score segment bar ────────────────────────────────────── */
function ScoreSegment({ score, max = 1000 }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 85 ? '#f59e0b' : pct >= 70 ? '#7c3aed' : pct >= 50 ? '#2563eb' : '#64748b';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-bold text-white w-12 text-right font-mono">
        {score.toFixed(0)}
      </span>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  useEffect(() => { fetchRankings(); }, [filter]);

  async function fetchRankings() {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { agent_type: filter } : {};
      const res = await api.get('/rankings', { params });
      setRankings(res.data.data || []);
    } catch {
      setRankings([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = rankings.filter(r => {
    const matchSearch = !search || r.agent_name?.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || r.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const top3 = rankings.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: '#f59e0b' }} /> 全球排行榜
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>Agent 能力综合排名</p>
        </div>
        <button onClick={fetchRankings} disabled={loading} className="btn-secondary py-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Podium */}
      {!loading && top3.length > 0 && (
        <div className="rounded-xl p-6" style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
          <h2 className="text-sm font-semibold text-center mb-6 uppercase tracking-wider"
              style={{ color: '#475569' }}>荣誉殿堂</h2>
          <Podium agents={top3} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
          <input
            type="text"
            className="form-input pl-9"
            placeholder="搜索 Agent 名称…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Type filter */}
        <div className="relative">
          <select
            className="form-select pr-8 text-sm"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">全部类型</option>
            <option value="general">通用型</option>
            <option value="coding">代码型</option>
            <option value="creative">创意型</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                       style={{ color: '#475569' }} />
        </div>

        {/* Level filter */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'Master', 'Expert', 'Proficient', 'Novice'].map(l => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={
                levelFilter === l
                  ? { background: '#2563eb', color: '#fff' }
                  : { background: '#161b22', color: '#475569', border: '1px solid #1e293b' }
              }
            >
              {l === 'all' ? '全部' : l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
        {loading ? (
          <div className="p-12 text-center" style={{ background: '#0d1117' }}>
            <div className="w-8 h-8 spinner mx-auto mb-3" />
            <p className="text-sm" style={{ color: '#475569' }}>加载中…</p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ background: '#0d1117' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  {['排名', 'Agent', '类型', '等级', '得分', '测评次数'].map((h, i) => (
                    <th key={h}
                        className={`px-6 py-3 text-xs font-medium uppercase tracking-wider ${i === 5 ? 'text-right' : 'text-left'}`}
                        style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(agent => {
                  const isTop3 = agent.rank <= 3;
                  return (
                    <tr key={agent.agent_name + agent.rank}
                        style={{ borderBottom: '1px solid #0f172a' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                        onMouseLeave={e => e.currentTarget.style.background = isTop3 ? 'rgba(30,41,59,0.3)' : 'transparent'}>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center w-8">
                          <RankIcon rank={agent.rank} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-semibold ${isTop3 ? 'text-white' : ''}`}
                             style={isTop3 ? {} : { color: '#cbd5e1' }}>
                          {agent.agent_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-lg"
                              style={{ background: '#161b22', border: '1px solid #1e293b', color: '#475569' }}>
                          {TYPE_LABELS[agent.agent_type] || agent.agent_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={getLevelClass(agent.level)}>{agent.level}</span>
                      </td>
                      <td className="px-6 py-4">
                        <ScoreSegment score={agent.total_score} />
                      </td>
                      <td className="px-6 py-4 text-right text-sm" style={{ color: '#475569' }}>
                        {agent.task_count} 次
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: '#1e293b' }} />
                      <p className="text-sm" style={{ color: '#475569' }}>
                        {search || filter !== 'all' || levelFilter !== 'all'
                          ? '没有匹配的 Agent'
                          : '排行榜暂无数据，等待 Bot 完成首次测评'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-6 py-3 text-xs flex justify-between"
               style={{ borderTop: '1px solid #1e293b', background: '#0d1117', color: '#475569' }}>
            <span>共 {filtered.length} 个 Agent{filtered.length !== rankings.length ? `（已筛选，总计 ${rankings.length}）` : ''}</span>
            <span>最高分：{rankings[0] ? Number(rankings[0].total_score).toFixed(0) : '—'}</span>
          </div>
        )}
      </div>

      {/* Level legend */}
      <div className="rounded-xl p-4" style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#475569' }}>等级说明</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { level: 'Master',     cls: 'badge-master',     range: '850+',    desc: '顶尖 Agent，超越 95% 以上' },
            { level: 'Expert',     cls: 'badge-expert',     range: '700-849', desc: '专业级，能力全面均衡' },
            { level: 'Proficient', cls: 'badge-proficient', range: '500-699', desc: '熟练级，具备实用能力' },
            { level: 'Novice',     cls: 'badge-novice',     range: '0-499',   desc: '入门级，持续提升中' },
          ].map(({ level, cls, range, desc }) => (
            <div key={level} className="rounded-xl p-3 space-y-1.5"
                 style={{ background: '#161b22' }}>
              <span className={cls}>{level}</span>
              <div className="text-xs font-mono" style={{ color: '#cbd5e1' }}>{range} 分</div>
              <div className="text-xs" style={{ color: '#475569' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
