import React, { useState, useEffect } from 'react';
import { Copy, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../services/api';

function TokenList() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newToken, setNewToken] = useState({
    name: '',
    description: '',
    agent_type: 'general',
    max_uses: 100
  });

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await api.get('/tokens');
      setTokens(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const createToken = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tokens', newToken);
      setShowCreateModal(false);
      setNewToken({ name: '', description: '', agent_type: 'general', max_uses: 100 });
      fetchTokens();
    } catch (error) {
      console.error('Failed to create token:', error);
      alert('创建失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const copyTokenCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Token代码已复制: ' + code);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'expired':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getAgentTypeLabel = (type) => {
    const labels = {
      'general': '通用型',
      'coding': '代码型',
      'creative': '创意型'
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">测评 Tokens</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          创建 Token
        </button>
      </div>

      {/* Token List */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Token 代码</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">名称</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">类型</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">使用次数</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">状态</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {tokens.map((token) => (
              <tr key={token.id} className="hover:bg-slate-700/30">
                <td className="px-6 py-4">
                  <code className="bg-slate-700 px-2 py-1 rounded text-sm">{token.token_code}</code>
                </td>
                <td className="px-6 py-4">{token.name}</td>
                <td className="px-6 py-4">
                  <span className="bg-slate-700 px-2 py-1 rounded text-sm">
                    {getAgentTypeLabel(token.agent_type)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={token.used_count >= token.max_uses ? 'text-red-400' : ''}>
                    {token.used_count} / {token.max_uses}
                  </span>
                </td>
                <td className="px-6 py-4">{getStatusIcon(token.status)}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => copyTokenCode(token.token_code)}
                    className="text-slate-400 hover:text-white p-1"
                    title="复制Token代码"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {tokens.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                  暂无 Tokens，点击上方按钮创建
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold mb-4">创建新 Token</h2>
            <form onSubmit={createToken} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名称</label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken({...newToken, name: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={newToken.description}
                  onChange={(e) => setNewToken({...newToken, description: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                  rows="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Agent 类型</label>
                <select
                  value={newToken.agent_type}
                  onChange={(e) => setNewToken({...newToken, agent_type: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                >
                  <option value="general">通用型</option>
                  <option value="coding">代码型</option>
                  <option value="creative">创意型</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">最大使用次数</label>
                <input
                  type="number"
                  value={newToken.max_uses}
                  onChange={(e) => setNewToken({...newToken, max_uses: parseInt(e.target.value)})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                  min="1"
                  max="10000"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TokenList;
