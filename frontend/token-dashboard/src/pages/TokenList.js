import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Copy, CheckCircle, XCircle, Clock,
  RefreshCw, Search, Key, X, ChevronDown
} from 'lucide-react';
import api from '../services/api';

/* ─── helpers ─────────────────────────────────────────────── */
function StatusBadge({ status }) {
  if (status === 'active')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
        <CheckCircle className="w-3 h-3" /> 活跃
      </span>
    );
  if (status === 'expired')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
        <Clock className="w-3 h-3" /> 已过期
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
      <XCircle className="w-3 h-3" /> 禁用
    </span>
  );
}

function UsageBar({ used, max }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500';
  return (
    <div className="space-y-1 min-w-[100px]">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{used}</span><span>{max}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const TYPE_LABELS = { general: '通用型', coding: '代码型', creative: '创意型', openai: 'OpenAI', anthropic: 'Anthropic' };

/* ─── CopyButton ───────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handle}
      className={`p-1.5 rounded-lg transition-all ${copied ? 'text-green-400 bg-green-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
      title="复制"
    >
      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

/* ─── Create Modal ─────────────────────────────────────────── */
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', agent_type: 'general', max_uses: 100 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/tokens', form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">创建新 Token</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">
              {error}
            </div>
          )}

          <div>
            <label className="form-label">Token 名称 *</label>
            <input
              type="text"
              className="form-input"
              placeholder="例如：GPT-4o 测评凭证"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="form-label">描述（可选）</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              placeholder="用途说明..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Agent 类型</label>
              <div className="relative">
                <select
                  className="form-select pr-8"
                  value={form.agent_type}
                  onChange={e => setForm({ ...form, agent_type: e.target.value })}
                >
                  <option value="general">通用型</option>
                  <option value="coding">代码型</option>
                  <option value="creative">创意型</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="form-label">最大使用次数</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="10000"
                value={form.max_uses}
                onChange={e => setForm({ ...form, max_uses: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              取消
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? (
                <>
                  <div className="w-4 h-4 spinner" /> 创建中…
                </>
              ) : '创建 Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function TokenList() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tokens');
      setTokens(res.data.data || []);
    } catch (err) {
      console.error('Fetch tokens error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  const filtered = tokens.filter(t => {
    const matchSearch = !search ||
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.token_code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">测评 Tokens</h1>
          <p className="text-sm text-slate-500 mt-0.5">管理 Agent 评测访问凭证</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> 创建 Token
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            className="form-input pl-9"
            placeholder="搜索 Token 名称或代码…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'expired'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                filterStatus === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {s === 'all' ? '全部' : s === 'active' ? '活跃' : '过期'}
            </button>
          ))}
        </div>
        <button onClick={fetchTokens} disabled={loading} className="btn-secondary py-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Token 代码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">使用量</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">过期时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(token => (
                  <tr key={token.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-800 border border-slate-700 text-blue-300 px-2.5 py-1 rounded-lg font-mono">
                          {token.token_code}
                        </code>
                        <CopyButton text={token.token_code} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{token.name}</div>
                      {token.description && (
                        <div className="text-xs text-slate-500 mt-0.5 max-w-[180px] truncate">{token.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
                        {TYPE_LABELS[token.agent_type] || token.agent_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <UsageBar used={token.used_count || 0} max={token.max_uses || 100} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {token.expires_at
                        ? new Date(token.expires_at).toLocaleDateString('zh-CN')
                        : <span className="text-slate-600">永久</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={token.status} />
                    </td>
                    <td className="px-6 py-4">
                      <CopyButton text={token.token_code} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <Key className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">
                        {search || filterStatus !== 'all' ? '没有匹配的 Token' : '还没有 Token，点击上方按钮创建'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-800 text-xs text-slate-500">
            共 {filtered.length} 条记录 {filtered.length !== tokens.length && `（已筛选，总计 ${tokens.length} 条）`}
          </div>
        )}
      </div>

      {showModal && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onCreated={fetchTokens}
        />
      )}
    </div>
  );
}
