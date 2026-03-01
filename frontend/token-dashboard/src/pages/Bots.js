import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Bot, Plus, Copy, CheckCircle, RefreshCw, Link2, X,
  Clock, Search, Shield, ChevronRight, Unlink
} from 'lucide-react';
import api from '../services/api';

/* ─── helpers ──────────────────────────────────────────────── */
function CopyButton({ text, size = 'sm' }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('已复制');
      setTimeout(() => setCopied(false), 2000);
    });
  }
  const cls = size === 'sm' ? 'p-1.5' : 'px-3 py-1.5 gap-1.5 text-xs';
  return (
    <button onClick={handle}
            className={`rounded-lg flex items-center transition-colors ${cls}`}
            style={{
              background: copied ? 'rgba(0,255,136,0.1)' : '#161b22',
              border: `1px solid ${copied ? 'rgba(0,255,136,0.2)' : '#1e293b'}`,
              color: copied ? '#00ff88' : '#64748b',
            }}>
      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {size !== 'sm' && (copied ? '已复制' : '复制')}
    </button>
  );
}

function BindingStatus({ status }) {
  const map = {
    bound:           { label: '已绑定',   color: '#00ff88', bg: 'rgba(0,255,136,0.1)' },
    pending_confirm: { label: '待确认',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    rejected:        { label: '已拒绝',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    expired:         { label: '已过期',   color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  };
  const s = map[status] || map.expired;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

/* ─── Invite Code Modal ─────────────────────────────────────── */
function InviteModal({ code, onClose }) {
  const snippet = `curl -X POST /api/v1/auth/bind \\
  -H "Authorization: Bearer <your_tmp_token>" \\
  -H "Content-Type: application/json" \\
  -d '{"invite_code": "${code}"}'`;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4"
         style={{ background: 'rgba(5,8,16,0.8)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: '#0d1117', border: '1px solid #1e293b' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-400" />
            邀请码已生成
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Code display */}
        <div className="rounded-xl p-4 text-center"
             style={{ background: '#161b22', border: '1px solid rgba(37,99,235,0.2)' }}>
          <p className="text-xs mb-2" style={{ color: '#64748b' }}>邀请码（24 小时有效）</p>
          <div className="flex items-center justify-center gap-3">
            <code className="text-xl font-bold font-mono" style={{ color: '#00ff88' }}>{code}</code>
            <CopyButton text={code} />
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-sm" style={{ color: '#64748b' }}>
          <p className="font-medium text-white text-sm">如何使用：</p>
          <ol className="space-y-1.5 list-decimal list-inside text-xs">
            <li>将邀请码发送给你的 Bot（邮件/配置文件/即时通讯）</li>
            <li>Bot 获取临时 Token 后，调用绑定接口提交邀请码</li>
            <li>返回控制台，在绑定请求列表中点击「确认」</li>
          </ol>
        </div>

        {/* API snippet */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
          <div className="flex items-center justify-between px-3 py-2"
               style={{ background: '#161b22', borderBottom: '1px solid #1e293b' }}>
            <span className="text-xs font-mono" style={{ color: '#475569' }}>bash</span>
            <CopyButton text={snippet} size="default" />
          </div>
          <pre className="p-3 text-xs font-mono overflow-x-auto leading-6"
               style={{ color: '#94a3b8', background: '#0d1117' }}>
            {snippet}
          </pre>
        </div>

        <button onClick={onClose} className="btn-primary w-full justify-center">
          我知道了
        </button>
      </motion.div>
    </div>
  );
}

/* ─── Confirm Binding Modal ────────────────────────────────── */
function ConfirmModal({ binding, onConfirm, onReject, onClose, loading }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4"
         style={{ background: 'rgba(5,8,16,0.8)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: '#0d1117', border: '1px solid #1e293b' }}
      >
        <h3 className="font-semibold text-white">确认 Bot 绑定</h3>
        <div className="rounded-xl p-4 space-y-2 text-sm"
             style={{ background: '#161b22' }}>
          <div className="flex justify-between">
            <span style={{ color: '#64748b' }}>Agent ID</span>
            <code className="text-blue-300">{binding.agent_id}</code>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#64748b' }}>邀请码</span>
            <code className="text-white">{binding.invite_code}</code>
          </div>
        </div>
        <p className="text-xs" style={{ color: '#64748b' }}>
          确认后，该 Bot 的所有评测记录将关联到你的控制台账户。
        </p>
        <div className="flex gap-3">
          <button onClick={() => onReject(binding.id)} disabled={loading}
                  className="btn-secondary flex-1 justify-center">
            拒绝
          </button>
          <button onClick={() => onConfirm(binding.id)} disabled={loading}
                  className="btn-primary flex-1 justify-center"
                  style={{ background: '#00ff88', color: '#050810' }}>
            {loading ? <div className="w-4 h-4 spinner" /> : <CheckCircle className="w-4 h-4" />}
            确认绑定
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function Bots() {
  const [bindings, setBindings] = useState([]);
  const [pendingBindings, setPendingBindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/human/bindings');
      const all = res.data.data?.items || res.data.data || [];
      setBindings(all.filter(b => b.status === 'bound'));
      setPendingBindings(all.filter(b => b.status === 'pending_confirm'));
    } catch {
      // Use demo data if API not ready
      setBindings([]);
      setPendingBindings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function generateInvite() {
    setGenLoading(true);
    try {
      const res = await api.post('/api/v1/human/invite-codes');
      setInviteCode(res.data.data.invite_code);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || '生成失败，请重试');
    } finally {
      setGenLoading(false);
    }
  }

  async function confirmBinding(bindingId) {
    setConfirmLoading(true);
    try {
      await api.post(`/api/v1/human/bindings/${bindingId}/confirm`);
      toast.success('绑定已确认！');
      setConfirmTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || '确认失败');
    } finally {
      setConfirmLoading(false);
    }
  }

  async function rejectBinding(bindingId) {
    setConfirmLoading(true);
    try {
      await api.post(`/api/v1/human/bindings/${bindingId}/reject`);
      toast.success('已拒绝绑定');
      setConfirmTarget(null);
      fetchData();
    } catch (err) {
      toast.error('操作失败');
    } finally {
      setConfirmLoading(false);
    }
  }

  const filtered = bindings.filter(b =>
    !search || b.agent_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Bot 管理</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>管理与你账户绑定的 AI Agents</p>
        </div>
        <button onClick={generateInvite} disabled={genLoading} className="btn-primary">
          {genLoading ? <div className="w-4 h-4 spinner" /> : <Plus className="w-4 h-4" />}
          生成邀请码
        </button>
      </div>

      {/* Binding workflow explainer */}
      <div className="rounded-xl p-5" style={{ background: '#0d1117', border: '1px solid rgba(37,99,235,0.2)' }}>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" /> 如何绑定 Bot？
        </h3>
        <div className="flex flex-wrap gap-2 text-xs" style={{ color: '#64748b' }}>
          {[
            '① 点击"生成邀请码"',
            '② 将邀请码发送给你的 Bot',
            '③ Bot 调用 /api/v1/auth/bind 提交邀请码',
            '④ 在下方"待确认"列表中点击"确认"',
            '⑤ 绑定完成，Bot 测评记录自动汇聚',
          ].map(step => (
            <div key={step} className="px-3 py-1.5 rounded-lg"
                 style={{ background: '#161b22', border: '1px solid #1e293b' }}>
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Pending confirmations */}
      {pendingBindings.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="flex items-center gap-2 px-5 py-3"
               style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
            <Clock className="w-4 h-4" style={{ color: '#f59e0b' }} />
            <span className="font-medium text-white">待确认绑定请求</span>
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: '#f59e0b', color: '#050810' }}>
              {pendingBindings.length}
            </span>
          </div>
          <div className="divide-y" style={{ background: '#0d1117', borderColor: '#1e293b' }}>
            {pendingBindings.map(b => (
              <div key={b.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="font-medium text-white">{b.agent_id}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    邀请码: {b.invite_code} · {new Date(b.initiated_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmTarget(b)}
                  className="btn-primary text-sm py-1.5"
                  style={{ background: '#00ff88', color: '#050810' }}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> 确认绑定
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bound bots list */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3"
             style={{ background: '#0d1117', borderBottom: '1px solid #1e293b' }}>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
            <input className="form-input pl-9 text-sm py-2"
                   placeholder="搜索 Agent ID…"
                   value={search}
                   onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={fetchData} disabled={loading} className="btn-secondary py-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
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
                  {['Agent ID', '绑定时间', '状态', '测评次数', '最高分', '操作'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider"
                        style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b.id || i} style={{ borderBottom: '1px solid #0f172a' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                             style={{ background: 'rgba(37,99,235,0.15)' }}>
                          <Bot className="w-4 h-4 text-blue-400" />
                        </div>
                        <code className="text-sm text-white">{b.agent_id}</code>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: '#64748b' }}>
                      {b.confirmed_at ? new Date(b.confirmed_at).toLocaleDateString('zh-CN') : '—'}
                    </td>
                    <td className="px-5 py-4"><BindingStatus status={b.status} /></td>
                    <td className="px-5 py-4 text-white font-mono">{b.task_count ?? '—'}</td>
                    <td className="px-5 py-4 font-bold font-mono"
                        style={{ color: b.best_score ? '#00ff88' : '#334155' }}>
                      {b.best_score?.toFixed(0) ?? '—'}
                    </td>
                    <td className="px-5 py-4">
                      <button className="btn-ghost text-xs py-1 px-2 gap-1 text-red-400 hover:text-red-300"
                              title="解除绑定">
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center">
                      <Bot className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: '#475569' }} />
                      <p className="text-sm mb-1" style={{ color: '#475569' }}>
                        {search ? '没有匹配的 Bot' : '还没有绑定的 Bot'}
                      </p>
                      {!search && (
                        <p className="text-xs" style={{ color: '#334155' }}>
                          点击「生成邀请码」开始绑定你的第一个 Bot
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-5 py-2 text-xs border-t" style={{ borderColor: '#1e293b', color: '#334155', background: '#0d1117' }}>
            共 {filtered.length} 个已绑定 Bot
          </div>
        )}
      </div>

      {/* Modals */}
      {inviteCode && <InviteModal code={inviteCode} onClose={() => setInviteCode(null)} />}
      {confirmTarget && (
        <ConfirmModal
          binding={confirmTarget}
          onConfirm={confirmBinding}
          onReject={rejectBinding}
          onClose={() => setConfirmTarget(null)}
          loading={confirmLoading}
        />
      )}
    </div>
  );
}
