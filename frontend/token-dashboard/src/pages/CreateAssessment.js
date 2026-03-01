import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';

function CreateAssessment() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState([]);
  const [formData, setFormData] = useState({
    token_code: '',
    agent_id: '',
    agent_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [createdTask, setCreatedTask] = useState(null);
  const [assessing, setAssessing] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await api.get('/tokens');
      const activeTokens = (response.data.data || []).filter(t => t.status === 'active');
      setTokens(activeTokens);
      if (activeTokens.length > 0) {
        setFormData(prev => ({ ...prev, token_code: activeTokens[0].token_code }));
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.token_code || !formData.agent_id || !formData.agent_name) {
      alert('请填写所有必填字段');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/tokens/${formData.token_code}/assessments`, formData);
      setCreatedTask(response.data.data);
    } catch (error) {
      console.error('Failed to create assessment:', error);
      alert('创建测评失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = async () => {
    if (!createdTask) return;
    
    setAssessing(true);
    try {
      await api.post(`/assessments/${createdTask.task_id}/start`);
      // 轮询状态
      pollStatus(createdTask.task_id);
    } catch (error) {
      console.error('Failed to start assessment:', error);
      alert('启动测评失败');
      setAssessing(false);
    }
  };

  const pollStatus = async (taskId) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/assessments/${taskId}/status`);
        const status = response.data.data;
        
        if (status.status === 'completed') {
          clearInterval(interval);
          setAssessing(false);
          // 获取报告并跳转
          const reportRes = await api.get(`/reports/task/${taskId}`);
          if (reportRes.data.data) {
            navigate(`/reports/${reportRes.data.data.report_code}`);
          }
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setAssessing(false);
          alert('测评失败');
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
      }
    }, 2000);
  };

  if (createdTask) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">测评任务已创建</h2>
          <p className="text-slate-400 mb-6">任务代码: {createdTask.task_code}</p>
          
          {!assessing ? (
            <button
              onClick={startAssessment}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
            >
              <Play className="w-5 h-5" />
              开始测评
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3 text-slate-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              测评进行中，请稍候...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">新建测评</h1>
      
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">选择 Token *</label>
            <select
              value={formData.token_code}
              onChange={(e) => setFormData({...formData, token_code: e.target.value})}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              required
            >
              <option value="">请选择 Token</option>
              {tokens.map(token => (
                <option key={token.id} value={token.token_code}>
                  {token.name} ({token.token_code}) - {token.used_count}/{token.max_uses}
                </option>
              ))}
            </select>
            {tokens.length === 0 && (
              <p className="text-yellow-400 text-sm mt-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                没有可用的 Token，请先<a href="/tokens" className="underline">创建一个</a>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Agent ID *</label>
            <input
              type="text"
              value={formData.agent_id}
              onChange={(e) => setFormData({...formData, agent_id: e.target.value})}
              placeholder="例如: agent_001"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              required
            />
            <p className="text-slate-400 text-sm mt-1">用于标识被测Agent的唯一ID</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Agent 名称 *</label>
            <input
              type="text"
              value={formData.agent_name}
              onChange={(e) => setFormData({...formData, agent_name: e.target.value})}
              placeholder="例如: My Awesome Agent"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              required
            />
            <p className="text-slate-400 text-sm mt-1">显示在排行榜中的名称</p>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              测评说明
            </h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• 测评预计耗时 3-5 分钟</li>
              <li>• 包含4个维度共1000分评估</li>
              <li>• 生成基础报告免费，深度报告 ¥9.9</li>
              <li>• 完成后自动进入排行榜</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || tokens.length === 0}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white py-3 rounded-lg font-medium"
          >
            {loading ? '创建中...' : '创建测评任务'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateAssessment;
