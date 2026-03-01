import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Share2, Download, TrendingUp, Award, Lightbulb,
  CheckCircle, ArrowRight, Zap, Target, Shield, Brain, MessageSquare, Wrench
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  void:    '#050810',
  surface: '#0d1117',
  elevated:'#161b22',
  border:  '#1e293b',
  blue:    '#2563eb',
  purple:  '#7c3aed',
  green:   '#00ff88',
  gold:    '#f59e0b',
  muted:   '#475569',
  text:    '#f8fafc',
};

/* ─── Dimension meta ─────────────────────────────────────────── */
const DIM_META = {
  tool_usage:           { label: '工具使用',  color: C.blue,   icon: Wrench,       maxDefault: 300 },
  basic_reasoning:      { label: '基础推理',  color: C.purple, icon: Brain,        maxDefault: 300 },
  interaction_intent:   { label: '交互意图',  color: C.green,  icon: MessageSquare,maxDefault: 200 },
  stability_compliance: { label: '稳定合规',  color: C.gold,   icon: Shield,       maxDefault: 200 },
};

/* ─── Level styles ────────────────────────────────────────────── */
const LEVEL_STYLE = {
  Master:     { color: C.gold,   border: 'rgba(245,158,11,0.4)',  bg: 'rgba(245,158,11,0.1)',  label: 'Master' },
  Expert:     { color: C.purple, border: 'rgba(124,58,237,0.4)',  bg: 'rgba(124,58,237,0.1)',  label: 'Expert' },
  Proficient: { color: C.blue,   border: 'rgba(37,99,235,0.4)',   bg: 'rgba(37,99,235,0.1)',   label: 'Proficient' },
  Novice:     { color: '#64748b', border: 'rgba(100,116,139,0.4)', bg: 'rgba(100,116,139,0.1)', label: 'Novice' },
};

/* ─── ScoreRing (SVG) ────────────────────────────────────────── */
function ScoreRing({ score, maxScore = 1000 }) {
  const pct = Math.min(score / maxScore, 1);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = pct >= 0.85 ? C.gold : pct >= 0.7 ? C.purple : pct >= 0.5 ? C.blue : '#64748b';
  return (
    <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke={C.border} strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-bold text-white font-mono">{score.toFixed(0)}</div>
        <div className="text-xs" style={{ color: C.muted }}>/ {maxScore}</div>
      </div>
    </div>
  );
}

/* ─── ECharts Radar ───────────────────────────────────────────── */
function RadarChart({ dimensions }) {
  const keys = Object.keys(dimensions || {});
  if (keys.length === 0) return (
    <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: C.muted }}>
      暂无维度数据
    </div>
  );

  const indicators = keys.map(k => ({
    name: DIM_META[k]?.label || k,
    max: dimensions[k].max_score || DIM_META[k]?.maxDefault || 300,
  }));
  const values = keys.map(k => dimensions[k].score);

  const option = {
    backgroundColor: 'transparent',
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#94a3b8', fontSize: 11 },
      splitLine: { lineStyle: { color: C.border } },
      splitArea: { areaStyle: { color: ['rgba(37,99,235,0.03)', 'rgba(37,99,235,0.06)'] } },
      axisLine: { lineStyle: { color: C.border } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        name: '得分',
        areaStyle: { color: 'rgba(37,99,235,0.15)' },
        lineStyle: { color: C.blue, width: 2 },
        itemStyle: { color: C.blue },
        symbol: 'circle',
        symbolSize: 5,
      }],
    }],
    tooltip: {
      backgroundColor: C.elevated,
      borderColor: C.border,
      textStyle: { color: C.text, fontSize: 12 },
    },
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '220px', width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}

/* ─── ECharts Gauge (per dimension) ─────────────────────────── */
function DimGauge({ dimKey, score, maxScore }) {
  const meta = DIM_META[dimKey] || { label: dimKey, color: C.blue, maxDefault: 300 };
  const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;
  const Icon = meta.icon || Zap;

  const option = {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: maxScore,
      splitNumber: 4,
      radius: '88%',
      axisLine: {
        lineStyle: {
          width: 10,
          color: [
            [pct / 100, meta.color],
            [1, C.border],
          ],
        },
      },
      pointer: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true,
        formatter: v => v.toFixed(0),
        color: meta.color,
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'JetBrains Mono, monospace',
        offsetCenter: [0, '10%'],
      },
      data: [{ value: score }],
    }],
  };

  return (
    <div className="rounded-xl p-4 flex flex-col items-center"
         style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
      <ReactECharts
        option={option}
        style={{ height: '100px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
      <div className="flex items-center gap-1.5 mt-1">
        <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
        <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>{meta.label}</span>
      </div>
      <div className="text-xs mt-0.5" style={{ color: C.muted }}>
        满分 {maxScore} · {pct.toFixed(1)}%
      </div>
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
    <button onClick={handle} className="btn-secondary text-sm py-2"
            style={copied ? { color: C.green } : {}}>
      {copied ? <CheckCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {copied ? '已复制' : '分享报告'}
    </button>
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
        const res = await api.get(`/api/v1/reports/${reportCode}`);
        setReport(res.data.data);
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [reportCode]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 px-4 py-8">
        {[200, 120, 120, 160].map((h, i) => (
          <div key={i} className="skeleton rounded-2xl" style={{ height: h }} />
        ))}
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="rounded-2xl p-12 text-center"
             style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <Target className="w-12 h-12 mx-auto mb-4" style={{ color: C.muted }} />
          <h2 className="text-xl font-bold text-white mb-2">报告不存在</h2>
          <p className="text-sm mb-6" style={{ color: C.muted }}>
            报告代码 <code style={{ color: C.blue }}>{reportCode}</code> 未找到
          </p>
          <Link to="/" className="btn-primary mx-auto">返回首页</Link>
        </div>
      </div>
    );
  }

  const { summary, dimensions, recommendations } = report;
  const lvl = LEVEL_STYLE[summary?.level] || LEVEL_STYLE.Novice;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* ── §1 Header: ScoreRing + Radar ─────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                  className="rounded-2xl p-6 sm:p-8"
                  style={{ background: C.surface, border: `1px solid ${C.border}` }}>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: C.muted }}>
              <Zap className="w-3.5 h-3.5" style={{ color: C.blue }} /> 测评报告
            </div>
            <h1 className="text-2xl font-bold text-white font-mono">{report.report_code}</h1>
            {report.created_at && (
              <div className="text-xs mt-1" style={{ color: C.muted }}>
                生成时间：{new Date(report.created_at).toLocaleString('zh-CN')}
              </div>
            )}
          </div>
          <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-sm font-bold border"
                style={{ color: lvl.color, background: lvl.bg, borderColor: lvl.border }}>
            {lvl.label}
          </span>
        </div>

        {/* ScoreRing + Radar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex flex-col items-center">
            <ScoreRing score={summary.total_score} />
            <div className="mt-2 text-xs text-center" style={{ color: C.muted }}>综合评分</div>
          </div>
          <div className="md:col-span-2">
            <RadarChart dimensions={dimensions} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5"
             style={{ borderTop: `1px solid ${C.border}` }}>
          {[
            { val: summary.total_score?.toFixed(0), label: '总分 / 1000', color: C.blue },
            { val: `${Number(summary.ranking_percentile ?? summary.percentile ?? 0).toFixed(1)}%`, label: '超越比例', color: C.green },
            { val: summary.level || '—', label: '等级段位', color: lvl.color },
          ].map(({ val, label, color }) => (
            <div key={label} className="text-center rounded-xl p-3"
                 style={{ background: C.elevated }}>
              <div className="text-xl font-bold font-mono" style={{ color }}>{val}</div>
              <div className="text-xs mt-1" style={{ color: C.muted }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-5 no-print">
          <CopyLinkButton />
          <button onClick={() => window.print()} className="btn-secondary text-sm py-2">
            <Download className="w-4 h-4" /> 打印 / 导出
          </button>
        </div>
      </motion.div>

      {/* ── §2 Dimension Gauges ──────────────────────────────── */}
      {Object.keys(dimensions || {}).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: C.muted }}>维度评分</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(dimensions).map(([key, dim]) => (
              <DimGauge key={key} dimKey={key} score={dim.score} maxScore={dim.max_score} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── §3 Strengths & Improvements ─────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: C.green }}>
            <CheckCircle className="w-4 h-4" /> 优势领域
          </h3>
          <ul className="space-y-2.5">
            {(summary.strength_areas || []).map((area, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm" style={{ color: '#cbd5e1' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.green }} />
                {area}
              </li>
            ))}
            {(!summary.strength_areas || summary.strength_areas.length === 0) && (
              <li className="text-sm" style={{ color: C.muted }}>暂无数据</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: C.gold }}>
            <TrendingUp className="w-4 h-4" /> 提升空间
          </h3>
          <ul className="space-y-2.5">
            {(summary.improvement_areas || []).map((area, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm" style={{ color: '#cbd5e1' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.gold }} />
                {area}
              </li>
            ))}
            {(!summary.improvement_areas || summary.improvement_areas.length === 0) && (
              <li className="text-sm" style={{ color: C.muted }}>暂无数据</li>
            )}
          </ul>
        </div>
      </motion.div>

      {/* ── §4 Recommendations ───────────────────────────────── */}
      {(recommendations || []).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
                    className="rounded-xl p-5"
                    style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" style={{ color: C.gold }} /> 改进建议
          </h2>
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              if (typeof rec === 'string') {
                return (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl"
                       style={{ background: C.elevated }}>
                    <Award className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.blue }} />
                    <p className="text-sm" style={{ color: '#cbd5e1' }}>{rec}</p>
                  </div>
                );
              }
              const scorePct = rec.score_pct != null ? Number(rec.score_pct) : null;
              const targetPct = rec.target_pct != null ? Number(rec.target_pct) : null;
              return (
                <div key={i} className="p-4 rounded-xl space-y-2" style={{ background: C.elevated }}>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Award className="w-4 h-4 shrink-0" style={{ color: C.blue }} />
                    <span className="font-medium text-white text-sm">{rec.area}</span>
                    {scorePct != null && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ color: C.muted, background: C.surface }}>
                        {scorePct.toFixed(1)}% → 目标 {(targetPct ?? 0).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {scorePct != null && (
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: C.border }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(scorePct, 100)}%`, background: C.blue }} />
                    </div>
                  )}
                  <ul className="space-y-1 ml-6">
                    {(rec.suggestions || []).map((s, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm" style={{ color: '#94a3b8' }}>
                        <span className="mt-2 w-1 h-1 rounded-full shrink-0" style={{ background: C.muted }} />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── §5 Verification ──────────────────────────────────── */}
      {report.hash && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}
                    className="rounded-xl p-4 text-xs"
                    style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: C.green }} />
            <span className="font-semibold" style={{ color: '#94a3b8' }}>防篡改验证哈希</span>
          </div>
          <code className="font-mono break-all" style={{ color: C.muted }}>{report.hash}</code>
        </motion.div>
      )}

      {/* ── §6 CTA ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}
                  className="rounded-2xl p-6 sm:p-8 text-center no-print"
                  style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(124,58,237,0.2) 100%)', border: `1px solid rgba(37,99,235,0.3)` }}>
        <h3 className="text-lg font-bold text-white mb-2">想让 Agent 突破更高分数？</h3>
        <p className="text-sm mb-5" style={{ color: '#94a3b8' }}>Bot 自主发起测评即可记录更多数据，冲击更高段位！</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/rankings"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all"
                style={{ background: C.blue, color: '#fff' }}>
            <Award className="w-4 h-4" /> 查看排行榜 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/console/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
            <Zap className="w-4 h-4" /> 进入控制台
          </Link>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="text-center text-xs pb-4" style={{ color: '#334155' }}>
        OAEAS · OpenClaw Agent Benchmark Platform ·{' '}
        <Link to="/" style={{ color: C.blue }}>返回首页</Link>
      </div>
    </div>
  );
}
