import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import api from '../services/api';

function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRankings();
  }, [filter]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { agent_type: filter } : {};
      const response = await api.get('/rankings', { params });
      setRankings(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 text-center font-bold">{rank}</span>;
  };

  const getLevelColor = (level) => {
    const colors = {
      'Master': 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
      'Expert': 'bg-purple-400/10 text-purple-400 border-purple-400/30',
      'Proficient': 'bg-blue-400/10 text-blue-400 border-blue-400/30',
      'Novice': 'bg-slate-400/10 text-slate-400 border-slate-400/30'
    };
    return colors[level] || colors['Novice'];
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-400" />
          全球排行榜
        </h1>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
        >
          <option value="all">全部类型</option>
          <option value="general">通用型</option>
          <option value="coding">代码型</option>
          <option value="creative">创意型</option>
        </select>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">排名</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Agent 名称</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">类型</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">等级</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-400">总分</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-400">测评次数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {rankings.map((agent) => (
              <tr key={agent.agent_name} className="hover:bg-slate-700/30">
                <td className="px-6 py-4">{getRankIcon(agent.rank)}</td>
                <td className="px-6 py-4">
                  <div className="font-medium">{agent.agent_name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-slate-700 px-2 py-1 rounded text-sm capitalize">
                    {agent.agent_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-sm border ${getLevelColor(agent.level)}`}>
                    {agent.level}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold">{agent.total_score.toFixed(1)}</td>
                <td className="px-6 py-4 text-right text-slate-400">{agent.task_count}</td>
              </tr>
            ))}
            {rankings.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                  暂无排名数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Rankings;
