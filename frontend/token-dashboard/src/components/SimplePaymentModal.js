import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';  // 需要安装: npm install qrcode.react
import { CheckCircle, Clock, Copy, RefreshCw } from 'lucide-react';
import api from '../services/api';

function SimplePaymentModal({ reportId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [checking, setChecking] = useState(false);
  const [paid, setPaid] = useState(false);

  // 支持的收款方式
  const paymentMethods = [
    {
      id: 'wechat_personal',
      name: '微信支付',
      icon: '💚',
      color: 'bg-green-500',
      description: '微信扫一扫，支付 ¥9.90'
    },
    {
      id: 'alipay_personal',
      name: '支付宝',
      icon: '💙',
      color: 'bg-blue-500',
      description: '支付宝扫一扫，支付 ¥9.90'
    }
  ];

  const [selectedMethod, setSelectedMethod] = useState('wechat_personal');

  useEffect(() => {
    if (reportId) {
      createOrder();
    }
  }, [reportId, selectedMethod]);

  const createOrder = async () => {
    setLoading(true);
    try {
      const response = await api.post('/payments-simple/create', null, {
        params: { report_id: reportId, channel: selectedMethod }
      });
      setOrder(response.data.data);
      // 开始轮询状态
      startPolling(response.data.data.order_code);
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (orderCode) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/payments-simple/${orderCode}/status`);
        if (response.data.data.status === 'paid') {
          clearInterval(interval);
          setPaid(true);
          onSuccess?.();
        }
      } catch (error) {
        console.error('Failed to check status:', error);
      }
    }, 3000);

    // 30分钟后停止轮询
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  const copyOrderCode = () => {
    if (order) {
      navigator.clipboard.writeText(order.order_code);
      alert('订单号已复制: ' + order.order_code);
    }
  };

  if (paid) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">支付成功！</h2>
          <p className="text-slate-400 mb-6">深度报告已解锁</p>
          <button
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            查看报告
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">解锁深度报告</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* 价格 */}
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-yellow-400">¥9.90</div>
          <div className="text-slate-400 text-sm">一次性解锁，永久查看</div>
        </div>

        {/* 支付方式选择 */}
        {!order && (
          <div className="space-y-3 mb-6">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full p-4 rounded-lg border-2 flex items-center gap-4 transition-all ${
                  selectedMethod === method.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className={`w-10 h-10 ${method.color} rounded-lg flex items-center justify-center text-xl`}>
                  {method.icon}
                </div>
                <div className="text-left">
                  <div className="font-medium">{method.name}</div>
                  <div className="text-sm text-slate-400">{method.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 收款码展示 */}
        {order && (
          <div className="space-y-4">
            {/* 订单号 */}
            <div className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400">订单号</div>
                <div className="font-mono">{order.order_code}</div>
              </div>
              <button
                onClick={copyOrderCode}
                className="p-2 hover:bg-slate-600 rounded"
                title="复制订单号"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {/* 二维码占位 */}
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-slate-900 mb-2">请使用{selectedMethod === 'wechat_personal' ? '微信' : '支付宝'}扫一扫</div>
              <div className="w-48 h-48 bg-slate-200 mx-auto rounded-lg flex items-center justify-center">
                <div className="text-slate-400 text-sm text-center">
                  [收款码图片]
                  <br />
                  请管理员上传
                </div>
              </div>
              <div className="text-slate-900 mt-2 font-bold">¥9.90</div>
            </div>

            {/* 操作指引 */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="text-yellow-400 font-medium mb-2">📱 支付步骤</div>
              <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                <li>保存上方收款码图片</li>
                <li>使用{selectedMethod === 'wechat_personal' ? '微信' : '支付宝'}扫一扫</li>
                <li>支付 ¥9.90，备注填写订单号</li>
                <li>截图支付成功页面</li>
                <li>联系管理员确认</li>
              </ol>
            </div>

            {/* 状态提示 */}
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              等待支付确认...
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>

            {/* 重新选择 */}
            <button
              onClick={() => setOrder(null)}
              className="w-full py-2 text-slate-400 hover:text-white flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              更换支付方式
            </button>
          </div>
        )}

        {/* 创建订单按钮 */}
        {!order && (
          <button
            onClick={createOrder}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white py-3 rounded-lg font-medium"
          >
            {loading ? '创建订单中...' : '确认支付 ¥9.90'}
          </button>
        )}
      </div>
    </div>
  );
}

export default SimplePaymentModal;
