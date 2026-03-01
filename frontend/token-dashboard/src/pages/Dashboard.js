import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Users, TrendingUp, Award, Clock } from 'lucide-react';
import api from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState({
    totalAssessments: 0,
    totalTokens: 0,
    avgScore: 0,
    topAgents: []
  });
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // 获取排行榜数据
      const rankingsRes = await api.get('/rankings');
      const rankings = rankingsRes.data.data || [];
      
      // 获取最近测评
      const assessmentsRes = await api.get('/assessments?limit=5');
      const assessments = assessmentsRes.data.data || [];
      
      // 计算统计
      setStats({
        totalAssessments: assessments.length,
        totalTokens: 0, // TODO: fetch from tokens API
        avgScore: rankings.length > 0 
          ? (rankings.reduce((acc, r) => acc + r.total_score, 0) / rankings.length).toFixed(1)
          : 0,
        topAgents: rankings.slice(0, 3)
      });
      
      setRecentAssessments(assessments);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    const colors = {
      'Master': 'text-yellow-400 bg-yellow-400/10',
      'Expert': 'text-purple-400 bg-purple-400/10',
      'Proficient': 'text-blue-400 bg-blue-400/10',
      'Novice': 'text-gray-400 bg-gray-400/10'
    };
    return colors[level] || colors['Novice'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Activity className="w-6 h-6 text-blue-400" />}
          title="总测评数"
          value={stats.totalAssessments}
          trend="+12%"
        />
        <StatCard 
          icon={<Users className="w-6 h-6 text-green-400" />}
          title="活跃Tokens"
          value={stats.totalTokens || '-'}
        />
        <StatCard 
          icon={<TrendingUp className="w-6 h-6 text-purple-400" />}
          title="平均分"
          value={stats.avgScore}
        />
        <StatCard 
          icon={<Award className="w-6 h-6 text-yellow-400" />}
          title="Master级Agent"
          value={stats.topAgents.filter(a => a.level === 'Master').length}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Agents */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            排行榜 TOP 3
          </h2>
          <div className="space-y-3">
            {stats.topAgents.map((agent, index) => (
              <div key={agent.agent_name} className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? 'bg-yellow-400 text-slate-900' :
                  index === 1 ? 'bg-gray-300 text-slate-900' :
                  index === 2 ? 'bg-amber-600 text-slate-900' :
                  'bg-slate-600 text-slate-300'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{agent.agent_name}</div>
                  <div className="text-sm text-slate-400">{agent.agent_type}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{agent.total_score.toFixed(1)}</div>
                  <span className={`text-xs px-2 py-0.5 rounded ${getLevelColor(agent.level)}`}>
                    {agent.level}
                  </span>
                </div>
              </div>
            ))}
            {stats.topAgents.length === 0 && (
              <div className="text-center text-slate-400 py-8">暂无排名数据</div>
            )}
          </div>
          <Link to="/rankings" className="mt-4 text-blue-400 hover:text-blue-300 text-sm inline-block">
            查看完整排行榜 →
          </Link>
        </div>

        {/* Recent Assessments */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            最近测评
          </h2>
          <div className="space-y-3">
            {recentAssessments.map((assessment) => (
              <div key={assessment.id} className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{assessment.agent_name}</div>
                    <div className="text-sm text-slate-400">{assessment.task_code}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{assessment.total_score > 0 ? assessment.total_score.toFixed(1) : '-'}</div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      assessment.level ? getLevelColor(assessment.level) : 'text-slate-400'
                    }`}>
                      {assessment.level || assessment.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {recentAssessments.length === 0 && (
              <div className="text-center text-slate-400 py-8">暂无测评记录</div>
            )}
          </div>
          <Link to="/assess" className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm inline-block">
            + 新建测评
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, trend }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-slate-700 rounded-lg">{icon}</div>
        {trend && (
          <span className="text-green-400 text-sm">{trend}</span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-slate-400">{title}</div>
      </div>
    </div>
  );
}

export default Dashboard;
