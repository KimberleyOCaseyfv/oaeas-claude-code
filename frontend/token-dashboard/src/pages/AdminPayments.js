import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import api from '../services/api';

function AdminPayments() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminKey, setAdminKey] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 实际项目中应该从环境变量或登录状态获取
  // 这里简单处理，页面加载时要求输入密钥

  useEffect(() => {
    if (adminKey) {
      fetchOrders();
    }
  }, [adminKey]);

  const fetchOrders = async () => {
    // 实际项目中应该有获取订单列表的API
    // 这里模拟数据
    setOrders([
      {
        order_code: 'OCBP20250301093012a1b2',
        amount: 9.90,
        channel: 'wechat_personal',
        status: 'pending',
        created_at: '2026-03-01T09:30:12Z',
        report_id: 'rep_001'
      },
      {
        order_code: 'OCBP20250301092533c4d5',
        amount: 9.90,
        channel: 'alipay_personal',
        status: 'paid',
        created_at: '2026-03-01T09:25:33Z',
        paid_at: '2026-03-01T09:26:15Z',
        report_id: 'rep_002'
      }
    ]);
    setLoading(false);
  };

  const confirmPayment = async (orderCode) => {
    try {
      await api.post(`/payments-simple/${orderCode}/confirm`, null, {
        params: { admin_key: adminKey }
      });
      alert('支付确认成功！');
      fetchOrders();
    } catch (error) {
      alert('确认失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-sm">已支付</span>;
      case 'pending':
        return <span className="bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded text-sm">待确认</span>;
      default:
        return <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded text-sm">失败</span>;
    }
  };

  const getChannelLabel = (channel) => {
    return channel === 'wechat_personal' ? '微信' : '支付宝';
  };

  const filteredOrders = orders.filter(o => 
    o.order_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!adminKey) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h1 className="text-xl font-bold mb-4">🔐 管理后台登录</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">管理员密钥</label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                placeholder="输入管理员密钥"
              />
            </div>
            <button
              onClick={() => setAdminKey(adminKey)}
              disabled={!adminKey}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white py-2 rounded-lg"
            >
              进入管理后台
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💰 支付订单管理</h1>
        <button
          onClick={() => setAdminKey('')}
          className="text-slate-400 hover:text-white"
        >
          退出登录
        </button>
      </div>

      {/* 搜索 */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索订单号..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2"
          />
        </div>
      </div>

      {/* 订单列表 */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">订单号</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">支付渠道</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-400">金额</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">状态</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">创建时间</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredOrders.map((order) => (
              <tr key={order.order_code} className="hover:bg-slate-700/30">
                <td className="px-6 py-4 font-mono text-sm">{order.order_code}</td>
                <td className="px-6 py-4">{getChannelLabel(order.channel)}</td>
                <td className="px-6 py-4 text-right">¥{order.amount.toFixed(2)}</td>
                <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {new Date(order.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {order.status === 'pending' ? (
                    <button
                      onClick={() => confirmPayment(order.order_code)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 ml-auto"
                    >
                      <CheckCircle className="w-4 h-4" />
                      确认收款
                    </button>
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                  )}
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                  暂无订单
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 操作说明 */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="font-medium mb-2">📋 操作说明</h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>1. 用户扫码支付后，订单会显示在这里</li>
          <li>2. 在微信/支付宝账单中核对订单号和金额</li>
          <li>3. 点击"确认收款"解锁用户的深度报告</li>
        </ul>
      </div>
    </div>
  );
}

export default AdminPayments;
