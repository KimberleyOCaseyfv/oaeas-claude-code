import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, TrendingUp, Award, Lightbulb, Share2 } from 'lucide-react';
import api from '../services/api';

function ReportView() {
  const { reportCode } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [reportCode]);

  const fetchReport = async () => {
    try {
      const response = await api.get(`/reports/${reportCode}`);
      setReport(response.data.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    const colors = {
      'Master': 'text-yellow-400 border-yellow-400',
      'Expert': 'text-purple-400 border-purple-400',
      'Proficient': 'text-blue-400 border-blue-400',
      'Novice': 'text-gray-400 border-gray-400'
    };
    return colors[level] || colors['Novice'];
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('报告链接已复制！');
  };

  const handleDownload = () => {
    // TODO: 实现PDF下载
    alert('PDF下载功能开发中...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-8 text-slate-400">
        报告不存在
      </div>
    );
  }

  const { summary, dimensions, recommendations } = report;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-slate-400 mb-1">测评报告</div>
            <h1 className="text-2xl font-bold">{report.report_code}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg border-2 font-bold ${getLevelColor(summary.level)}`}>
              {summary.level}
            </div>
            <button
              onClick={handleShare}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
              title="分享报告"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 bg-slate-700/50 rounded-lg">
            <div className="text-3xl font-bold text-blue-400">{summary.total_score.toFixed(1)}</div>
            <div className="text-sm text-slate-400">总分 / 1000</div>
          </div>
          <div className="text-center p-4 bg-slate-700/50 rounded-lg">
            <div className="text-3xl font-bold text-green-400">{summary.ranking_percentile.toFixed(1)}%</div>
            <div className="text-sm text-slate-400">排名百分位</div>
          </div>
          <div className="text-center p-4 bg-slate-700/50 rounded-lg">
            <div className="text-3xl font-bold text-purple-400">完整版</div>
            <div className="text-sm text-slate-400">🎉 限时免费</div>
          </div>
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="font-semibold mb-3 text-green-400">💪 优势领域</h3>
          <ul className="space-y-2">
            {summary.strength_areas.map((area, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                {area}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="font-semibold mb-3 text-yellow-400">📈 提升空间</h3>
          <ul className="space-y-2">
            {summary.improvement_areas.map((area, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dimensions */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          维度评分
        </h2>
        <div className="space-y-4">
          {Object.entries(dimensions).map(([key, dim]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                <span className="text-slate-400">
                  {dim.score.toFixed(1)} / {dim.max_score}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(dim.score / dim.max_score) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          改进建议
        </h2>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div key={index} className="p-4 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-blue-400" />
                <span className="font-medium">{rec.area}</span>
                <span className="text-sm text-slate-400">
                  ({rec.score.toFixed(1)} → {rec.target})
                </span>
              </div>
              <ul className="text-sm text-slate-300 space-y-1 ml-6">
                {rec.suggestions.map((suggestion, i) => (
                  <li key={i}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-center">
        <h3 className="text-xl font-bold mb-2">🚀 想要提升你的Agent能力？</h3>
        <p className="text-blue-100 mb-4">根据报告建议针对性训练，下次测评冲击更高分数！</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/assess'}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50"
          >
            再次测评
          </button>
          <button
            onClick={() => window.location.href = '/rankings'}
            className="bg-blue-500 bg-opacity-30 text-white border border-white/30 px-6 py-2 rounded-lg font-medium hover:bg-opacity-40"
          >
            查看排行榜
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-slate-500 text-sm">
        报告生成时间: {new Date(report.created_at).toLocaleString()} | 
        <a href="/" className="text-blue-400 hover:underline">OAEAS - OpenClaw Agent Benchmark Platform</a>
      </div>
    </div>
  );
}

export default ReportView;
