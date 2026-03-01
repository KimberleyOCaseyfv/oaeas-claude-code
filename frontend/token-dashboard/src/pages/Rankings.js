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
      1: { ring: 'ring-yellow-400/40', bg: 'from-yellow-500/15 to-yellow-500/5', icon: <Crown className="w-6 h-6 text-yellow-400" />, h: 'h-32', medal: 'bg-yellow-400 text-slate-900' },
      2: { ring: 'ring-slate-400/30', bg: 'from-slate-500/15 to-slate-500/5', icon: <Medal className="w-5 h-5 text-slate-300" />, h: 'h-24', medal: 'bg-slate-300 text-slate-900' },
      3: { ring: 'ring-amber-600/30', bg: 'from-amber-600/15 to-amber-600/5', icon: <Award className="w-5 h-5 text-amber-500" />, h: 'h-20', medal: 'bg-amber-600 text-white' },
    }[pos];

    return (
      <div className={`flex-1 flex flex-col items-center gap-2`}>
        <div className={`w-12 h-12 ${styles.medal} rounded-full flex items-center justify-center font-bold text-lg shadow-lg`}>
          {pos}
        </div>
        <div className={`w-full card bg-gradient-to-b ${styles.bg} ring-1 ${styles.ring} p-3 text-center ${styles.h} flex flex-col justify-center`}>
          <div className="flex items-center justify-center gap-1 mb-1">{styles.icon}</div>
          <div className="font-bold text-white text-sm truncate px-1">{agent.agent_name}</div>
          <div className="text-2xl font-black text-white mt-1">{Number(agent.total_score).toFixed(0)}</div>
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
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-500" />;
  return <span className="w-5 text-center text-sm font-bold text-slate-500">{rank}</span>;
}

/* ─── Score segment bar ────────────────────────────────────── */
function ScoreSegment({ score, max = 1000 }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 85 ? '#eab308' : pct >= 70 ? '#a855f7' : pct >= 50 ? '#3b82f6' : '#64748b';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold text-white w-12 text-right">{score.toFixed(0)}</span>
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
    } catch (err) {
      console.error('Fetch rankings error:', err);
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
            <Trophy className="w-5 h-5 text-yellow-400" /> 全球排行榜
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Agent 能力综合排名</p>
        </div>
        <button onClick={fetchRankings} disabled={loading} className="btn-secondary py-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Podium */}
      {!loading && top3.length > 0 && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-400 text-center mb-6 uppercase tracking-wider">
            荣誉殿堂
          </h2>
          <Podium agents={top3} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
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
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>

        {/* Level filter */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'Master', 'Expert', 'Proficient', 'Novice'].map(l => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                levelFilter === l
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {l === 'all' ? '全部' : l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 spinner mx-auto mb-3" />
            <p className="text-slate-500 text-sm">加载中…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-16">排名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">等级</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">得分</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">测评次数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((agent, idx) => {
                  const isTop3 = agent.rank <= 3;
                  return (
                    <tr
                      key={agent.agent_name + agent.rank}
                      className={`transition-colors ${
                        isTop3
                          ? 'bg-gradient-to-r from-slate-800/40 to-transparent hover:from-slate-800/70'
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center w-8">
                          <RankIcon rank={agent.rank} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-semibold ${isTop3 ? 'text-white' : 'text-slate-200'}`}>
                          {agent.agent_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-1 rounded-lg">
                          {TYPE_LABELS[agent.agent_type] || agent.agent_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={getLevelClass(agent.level)}>{agent.level}</span>
                      </td>
                      <td className="px-6 py-4">
                        <ScoreSegment score={agent.total_score} />
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-400">
                        {agent.task_count} 次
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <Trophy className="w-12 h-12 text-slate-800 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">
                        {search || filter !== 'all' || levelFilter !== 'all'
                          ? '没有匹配的 Agent'
                          : '排行榜暂无数据，快去发起第一次测评吧！'}
                      </p>
                      {rankings.length === 0 && (
                        <Link to="/assess" className="btn-primary mx-auto mt-4 inline-flex">
                          <Zap className="w-4 h-4" /> 发起测评
                        </Link>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
            <span>共 {filtered.length} 个 Agent{filtered.length !== rankings.length ? `（已筛选，总计 ${rankings.length}）` : ''}</span>
            <span>最高分：{rankings[0] ? Number(rankings[0].total_score).toFixed(0) : '—'}</span>
          </div>
        )}
      </div>

      {/* Level legend */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">等级说明</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { level: 'Master',     cls: 'badge-master',     range: '850+',    desc: '顶尖 Agent，超越 95% 以上' },
            { level: 'Expert',     cls: 'badge-expert',     range: '700-849', desc: '专业级，能力全面均衡' },
            { level: 'Proficient', cls: 'badge-proficient', range: '500-699', desc: '熟练级，具备实用能力' },
            { level: 'Novice',     cls: 'badge-novice',     range: '0-499',   desc: '入门级，持续提升中' },
          ].map(({ level, cls, range, desc }) => (
            <div key={level} className="bg-slate-800/60 rounded-xl p-3 space-y-1.5">
              <span className={cls}>{level}</span>
              <div className="text-xs font-mono text-slate-300">{range} 分</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
