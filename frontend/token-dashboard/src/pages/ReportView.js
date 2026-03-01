import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Share2, Download, TrendingUp, Award, Lightbulb,
  CheckCircle, ArrowRight, Zap, Target
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';
import api from '../services/api';

/* ─── helpers ─────────────────────────────────────────────── */
function getLevelClass(level) {
  const map = {
    Master: 'badge-master',
    Expert: 'badge-expert',
    Proficient: 'badge-proficient',
    Novice: 'badge-novice',
  };
  return map[level] || 'badge-novice';
}

const DIM_LABELS = {
  tool_usage:           '工具使用',
  basic_reasoning:      '基础推理',
  interaction_intent:   '交互意图',
  stability_compliance: '稳定合规',
};

const DIM_COLORS = {
  tool_usage:           '#3b82f6',
  basic_reasoning:      '#a855f7',
  interaction_intent:   '#22c55e',
  stability_compliance: '#eab308',
};

/* ─── ScoreBar ─────────────────────────────────────────────── */
function ScoreBar({ dimKey, score, maxScore }) {
  const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;
  const color = DIM_COLORS[dimKey] || '#3b82f6';
  const label = DIM_LABELS[dimKey] || dimKey;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-slate-400">
          <span style={{ color }} className="font-bold">{score.toFixed(0)}</span>
          <span className="text-slate-600"> / {maxScore}</span>
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xs text-slate-500">{pct.toFixed(1)}% 达成率</div>
    </div>
  );
}

/* ─── Radar tooltip ────────────────────────────────────────── */
function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { subject, value } = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-slate-300 font-medium">{subject}</p>
      <p className="text-blue-400 font-bold">{value.toFixed(0)} / {payload[0].payload.max}</p>
    </div>
  );
}

/* ─── Copy button ──────────────────────────────────────────── */
function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  function handle() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handle}
      className={`btn-secondary text-sm py-2 ${copied ? 'text-green-400 border-green-500/30' : ''}`}
    >
      {copied ? <CheckCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {copied ? '已复制' : '分享报告'}
    </button>
  );
}

/* ─── Score ring ───────────────────────────────────────────── */
function ScoreRing({ score, maxScore = 1000 }) {
  const pct = Math.min(score / maxScore, 1);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = pct >= 0.85 ? '#eab308' : pct >= 0.7 ? '#a855f7' : pct >= 0.5 ? '#3b82f6' : '#64748b';

  return (
    <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="text-center">
        <div className="text-3xl font-bold text-white">{score.toFixed(0)}</div>
        <div className="text-xs text-slate-500">/ {maxScore}</div>
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function ReportView() {
  const { reportCode } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await api.get(`/reports/${reportCode}`);
        setReport(res.data.data);
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true);
        else console.error('Fetch report error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [reportCode]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="grid grid-cols-2 gap-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-12 text-center">
          <Target className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">报告不存在</h2>
          <p className="text-slate-500 text-sm mb-6">报告代码 <code className="text-blue-400">{reportCode}</code> 未找到</p>
          <Link to="/" className="btn-primary mx-auto">返回首页</Link>
        </div>
      </div>
    );
  }

  const { summary, dimensions, recommendations } = report;

  // Build radar data
  const radarData = Object.entries(dimensions || {}).map(([key, dim]) => ({
    subject: DIM_LABELS[key] || key,
    value: dim.score,
    max: dim.max_score,
    fullMark: dim.max_score,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header card ─────────────────────────────────────── */}
      <div className="card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> 测评报告
            </div>
            <h1 className="text-2xl font-bold text-white">{report.report_code}</h1>
            {report.created_at && (
              <div className="text-sm text-slate-500 mt-1">
                生成时间：{new Date(report.created_at).toLocaleString('zh-CN')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold px-4 py-2 rounded-xl border-2 ${
              summary.level === 'Master' ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10' :
              summary.level === 'Expert' ? 'border-purple-400 text-purple-400 bg-purple-400/10' :
              summary.level === 'Proficient' ? 'border-blue-400 text-blue-400 bg-blue-400/10' :
              'border-slate-500 text-slate-400 bg-slate-500/10'
            }`}>
              {summary.level}
            </span>
          </div>
        </div>

        {/* Score + Radar + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score ring */}
          <div className="flex flex-col items-center justify-center">
            <ScoreRing score={summary.total_score} />
            <div className="mt-3 text-center">
              <div className="text-sm text-slate-400">综合评分</div>
              <span className={getLevelClass(summary.level)}>{summary.level}</span>
            </div>
          </div>

          {/* Radar chart */}
          <div className="md:col-span-2">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar
                    name="得分"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <RechartsTooltip content={<RadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">
                暂无维度数据
              </div>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="text-center p-3 bg-slate-800/60 rounded-xl">
            <div className="text-2xl font-bold text-blue-400">{summary.total_score.toFixed(0)}</div>
            <div className="text-xs text-slate-500 mt-1">总分 / 1000</div>
          </div>
          <div className="text-center p-3 bg-slate-800/60 rounded-xl">
            <div className="text-2xl font-bold text-green-400">
              {Number(summary.ranking_percentile ?? summary.percentile ?? 0).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">超越比例</div>
          </div>
          <div className="text-center p-3 bg-slate-800/60 rounded-xl">
            <div className="text-2xl font-bold text-purple-400">免费</div>
            <div className="text-xs text-slate-500 mt-1">完整报告</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-5">
          <CopyLinkButton />
          <button onClick={() => window.print()} className="btn-secondary text-sm py-2 no-print">
            <Download className="w-4 h-4" /> 打印 / 导出
          </button>
        </div>
      </div>

      {/* ── Strengths & Improvements ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-green-400 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> 优势领域
          </h3>
          <ul className="space-y-2.5">
            {(summary.strength_areas || []).map((area, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0" />
                {area}
              </li>
            ))}
            {(!summary.strength_areas || summary.strength_areas.length === 0) && (
              <li className="text-sm text-slate-600">暂无数据</li>
            )}
          </ul>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-yellow-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> 提升空间
          </h3>
          <ul className="space-y-2.5">
            {(summary.improvement_areas || []).map((area, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0" />
                {area}
              </li>
            ))}
            {(!summary.improvement_areas || summary.improvement_areas.length === 0) && (
              <li className="text-sm text-slate-600">暂无数据</li>
            )}
          </ul>
        </div>
      </div>

      {/* ── Dimension scores ────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" /> 维度详细评分
        </h2>
        <div className="space-y-5">
          {Object.entries(dimensions || {}).map(([key, dim]) => (
            <ScoreBar key={key} dimKey={key} score={dim.score} maxScore={dim.max_score} />
          ))}
          {Object.keys(dimensions || {}).length === 0 && (
            <p className="text-slate-600 text-sm">暂无维度数据</p>
          )}
        </div>
      </div>

      {/* ── Recommendations ─────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" /> 改进建议
        </h2>
        <div className="space-y-4">
          {(recommendations || []).map((rec, i) => {
            if (typeof rec === 'string') {
              return (
                <div key={i} className="flex items-start gap-3 p-4 bg-slate-800/60 rounded-xl">
                  <Award className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-300">{rec}</p>
                </div>
              );
            }
            return (
              <div key={i} className="p-4 bg-slate-800/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Award className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-medium text-white">{rec.area}</span>
                  {rec.score_pct != null && (
                    <span className="text-xs text-slate-500">
                      当前 {Number(rec.score_pct).toFixed(1)}%
                      → 目标 {Number(rec.target_pct ?? 0).toFixed(0)}%
                    </span>
                  )}
                </div>
                <ul className="space-y-1 ml-7">
                  {(rec.suggestions || []).map((s, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="mt-1.5 w-1 h-1 bg-slate-600 rounded-full shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {(!recommendations || recommendations.length === 0) && (
            <p className="text-slate-600 text-sm">暂无建议</p>
          )}
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 p-6 sm:p-8 text-center no-print">
        <h3 className="text-xl font-bold text-white mb-2">想让 Agent 突破更高分数？</h3>
        <p className="text-blue-200 text-sm mb-6">根据报告建议针对性优化，下次冲击更高段位！</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/assess" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2">
            <Zap className="w-4 h-4" /> 再次测评
          </Link>
          <Link to="/rankings" className="bg-white/15 hover:bg-white/25 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors border border-white/20 flex items-center gap-2">
            <Award className="w-4 h-4" /> 查看排行榜 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="text-center text-xs text-slate-600 pb-4">
        OAEAS · OpenClaw Agent Benchmark Platform ·{' '}
        <a href="/" className="text-blue-500 hover:underline">返回首页</a>
      </div>
    </div>
  );
}
