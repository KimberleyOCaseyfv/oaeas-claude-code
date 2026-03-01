import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search, RefreshCw, Lock, CreditCard, X } from 'lucide-react';
import api from '../services/api';

/* ─── helpers ─────────────────────────────────────────────── */
function StatusBadge({ status }) {
  if (status === 'paid')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
        <CheckCircle className="w-3 h-3" /> 已支付
      </span>
    );
  if (status === 'pending')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
        <Clock className="w-3 h-3" /> 待确认
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
      <XCircle className="w-3 h-3" /> 失败
    </span>
  );
}

function ChannelBadge({ channel }) {
  if (channel === 'wechat_personal')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
        💚 微信
      </span>
    );
  if (channel === 'alipay_personal')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
        💙 支付宝
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg"
          style={{ background: '#161b22', color: '#475569', border: '1px solid #1e293b' }}>
      {channel}
    </span>
  );
}

/* ─── Confirm dialog ───────────────────────────────────────── */
function ConfirmDialog({ order, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="rounded-2xl w-full max-w-sm shadow-2xl"
           style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid #1e293b' }}>
          <h3 className="font-semibold text-white">确认收款</h3>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors"
                  style={{ color: '#475569' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#161b22'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent'; }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: '#475569' }}>订单号</span>
              <code className="text-blue-400 text-xs">{order.order_code}</code>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#475569' }}>支付渠道</span>
              <ChannelBadge channel={order.channel} />
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#475569' }}>金额</span>
              <span className="text-green-400 font-bold">¥{order.amount?.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-400">
            请确认已在微信/支付宝账单中核对该订单后再操作
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">取消</button>
            <button
              onClick={() => onConfirm(order.order_code)}
              disabled={loading}
              className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-500"
            >
              {loading ? <div className="w-4 h-4 spinner" /> : <CheckCircle className="w-4 h-4" />}
              确认收款
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Login ────────────────────────────────────────────────── */
function AdminLogin({ onLogin }) {
  const [key, setKey] = useState('');
  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="card p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white mb-1">管理后台</h1>
          <p className="text-sm" style={{ color: '#475569' }}>支付订单管理</p>
        </div>
        <div className="space-y-3 text-left">
          <label className="form-label">管理员密钥</label>
          <input
            type="password"
            className="form-input"
            placeholder="输入管理员密钥…"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && key && onLogin(key)}
          />
          <button
            onClick={() => onLogin(key)}
            disabled={!key}
            className="btn-primary w-full justify-center"
          >
            进入管理后台
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Stats row ────────────────────────────────────────────── */
function StatsRow({ orders }) {
  const total = orders.length;
  const paid = orders.filter(o => o.status === 'paid').length;
  const pending = orders.filter(o => o.status === 'pending').length;
  const revenue = orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.amount || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { label: '总订单', value: total, color: 'text-white' },
        { label: '已支付', value: paid, color: 'text-green-400' },
        { label: '待确认', value: pending, color: 'text-yellow-400' },
        { label: '总收入', value: `¥${revenue.toFixed(2)}`, color: 'text-blue-400' },
      ].map(s => (
        <div key={s.label} className="card p-4 text-center">
          <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-xs mt-1" style={{ color: '#475569' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function AdminPayments() {
  const [adminKey, setAdminKey] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmTarget, setConfirmTarget] = useState(null);

  useEffect(() => {
    if (adminKey) fetchOrders();
  }, [adminKey]);

  async function fetchOrders() {
    setLoading(true);
    // Fallback to demo data until real API is available
    try {
      const res = await api.get('/api/v1/payments/orders', {
        params: { admin_key: adminKey }
      });
      setOrders(res.data.data || []);
    } catch {
      // Use mock data for demo
      setOrders([
        {
          order_code: 'OCBP20260301093012a1b2',
          amount: 9.90,
          channel: 'wechat_personal',
          status: 'pending',
          created_at: new Date().toISOString(),
          report_id: 'rep_001',
        },
        {
          order_code: 'OCBP20260301092533c4d5',
          amount: 9.90,
          channel: 'alipay_personal',
          status: 'paid',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          paid_at: new Date(Date.now() - 3540000).toISOString(),
          report_id: 'rep_002',
        },
        {
          order_code: 'OCBP20260228154400e6f7',
          amount: 9.90,
          channel: 'wechat_personal',
          status: 'paid',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          paid_at: new Date(Date.now() - 86340000).toISOString(),
          report_id: 'rep_003',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(orderCode) {
    setConfirming(true);
    try {
      await api.post(`/payments-simple/${orderCode}/confirm`, null, {
        params: { admin_key: adminKey }
      });
      setOrders(prev => prev.map(o =>
        o.order_code === orderCode
          ? { ...o, status: 'paid', paid_at: new Date().toISOString() }
          : o
      ));
      setConfirmTarget(null);
    } catch (err) {
      alert('确认失败: ' + (err.response?.data?.message || err.message));
    } finally {
      setConfirming(false);
    }
  }

  if (!adminKey) return <AdminLogin onLogin={setAdminKey} />;

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.order_code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" /> 支付订单管理
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>人工收款确认后台</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchOrders} disabled={loading} className="btn-secondary py-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setAdminKey('')} className="btn-ghost text-sm py-2 text-red-400 hover:text-red-300">
            退出
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsRow orders={orders} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
          <input
            type="text"
            className="form-input pl-9"
            placeholder="搜索订单号…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'paid'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={
                statusFilter === s
                  ? { background: '#2563eb', color: '#fff' }
                  : { background: '#161b22', color: '#475569', border: '1px solid #1e293b' }
              }
            >
              {s === 'all' ? '全部' : s === 'pending' ? '待确认' : '已支付'}
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
                  {['订单号', '渠道', '金额', '状态', '创建时间', '支付时间', '操作'].map((h, i) => (
                    <th key={h}
                        className={`px-6 py-3 text-xs font-medium uppercase tracking-wider ${i === 2 || i === 6 ? 'text-right' : 'text-left'}`}
                        style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.order_code} style={{ borderBottom: '1px solid #0f172a' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-6 py-4">
                      <code className="text-xs font-mono" style={{ color: '#cbd5e1' }}>{order.order_code}</code>
                    </td>
                    <td className="px-6 py-4">
                      <ChannelBadge channel={order.channel} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-green-400">¥{order.amount?.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-xs" style={{ color: '#475569' }}>
                      {new Date(order.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-xs" style={{ color: '#475569' }}>
                      {order.paid_at ? new Date(order.paid_at).toLocaleString('zh-CN') : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.status === 'pending' ? (
                        <button
                          onClick={() => setConfirmTarget(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs rounded-lg transition-colors font-medium"
                          style={{ background: '#16a34a' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
                          onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> 确认收款
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: '#1e293b' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <CreditCard className="w-10 h-10 mx-auto mb-3" style={{ color: '#1e293b' }} />
                      <p className="text-sm" style={{ color: '#475569' }}>暂无订单记录</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-6 py-3 text-xs" style={{ borderTop: '1px solid #1e293b', background: '#0d1117', color: '#475569' }}>
            共 {filtered.length} 条{filtered.length !== orders.length ? `（已筛选，总计 ${orders.length}）` : ''}
          </div>
        )}
      </div>

      {/* Guide */}
      <div className="rounded-xl p-5" style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
        <h3 className="font-semibold text-white mb-3 text-sm">操作指南</h3>
        <ol className="text-xs space-y-2 list-decimal list-inside" style={{ color: '#475569' }}>
          <li>用户完成测评后，选择微信/支付宝扫码支付 ¥9.90</li>
          <li>用户支付成功后，订单状态变为「待确认」</li>
          <li>在微信/支付宝收款账单中核对订单号和金额</li>
          <li>确认无误后点击「确认收款」，系统自动解锁深度报告</li>
          <li>如有疑问请联系平台管理员</li>
        </ol>
      </div>

      {/* Confirm dialog */}
      {confirmTarget && (
        <ConfirmDialog
          order={confirmTarget}
          onConfirm={handleConfirm}
          onClose={() => setConfirmTarget(null)}
          loading={confirming}
        />
      )}
    </div>
  );
}
