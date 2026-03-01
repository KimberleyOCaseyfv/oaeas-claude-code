import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Play, CheckCircle, AlertCircle, Clock, Zap,
  ChevronDown, Bot, Hash, Tag, Shield
} from 'lucide-react';
import api from '../services/api';

/* ─── Protocol option card ─────────────────────────────────── */
const PROTOCOLS = [
  {
    id: 'openai',
    label: 'OpenAI',
    desc: 'GPT-4, GPT-3.5 等 OpenAI 兼容协议',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/25',
    activeBg: 'bg-green-500/20 border-green-400/50',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    desc: 'Claude 系列模型专用协议',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/25',
    activeBg: 'bg-purple-500/20 border-purple-400/50',
  },
  {
    id: 'openclaw',
    label: 'OpenClaw',
    desc: 'OpenClaw 原生协议（推荐）',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/25',
    activeBg: 'bg-blue-500/20 border-blue-400/50',
  },
  {
    id: 'mock',
    label: 'Mock',
    desc: '模拟协议，用于测试和演示',
    color: 'text-slate-400',
    bg: 'bg-slate-700/30 border-slate-600/25',
    activeBg: 'bg-slate-700/50 border-slate-400/50',
  },
];

/* ─── Phase indicator ──────────────────────────────────────── */
function PhaseStep({ phase, current, label }) {
  const done = current > phase;
  const active = current === phase;
  return (
    <div className={`flex items-center gap-2 text-sm ${done ? 'text-green-400' : active ? 'text-blue-400' : 'text-slate-600'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border
        ${done ? 'bg-green-500/20 border-green-400' : active ? 'bg-blue-500/20 border-blue-400 animate-pulse' : 'bg-slate-800 border-slate-700'}`}>
        {done ? <CheckCircle className="w-3.5 h-3.5" /> : phase}
      </div>
      <span>{label}</span>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function CreateAssessment() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState([]);
  const [form, setForm] = useState({
    token_code: '',
    agent_id: '',
    agent_name: '',
    protocol: 'mock',
  });
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [createdTask, setCreatedTask] = useState(null);
  const [assessing, setAssessing] = useState(false);
  const [phase, setPhase] = useState(0); // 0=idle 1=running 2=scoring 3=done
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchTokens();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function fetchTokens() {
    setTokenLoading(true);
    try {
      const res = await api.get('/tokens');
      const active = (res.data.data || []).filter(t => t.status === 'active');
      setTokens(active);
      if (active.length > 0) setForm(f => ({ ...f, token_code: active[0].token_code }));
    } catch (err) {
      console.error('Fetch tokens error:', err);
    } finally {
      setTokenLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.token_code || !form.agent_id || !form.agent_name) {
      setError('请填写所有必填字段');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post(`/tokens/${form.token_code}/assessments`, form);
      setCreatedTask(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || '创建失败');
    } finally {
      setLoading(false);
    }
  }

  async function startAssessment() {
    if (!createdTask) return;
    setAssessing(true);
    setPhase(1);
    setProgress(0);

    // Simulate progress animation
    let prog = 0;
    const progInterval = setInterval(() => {
      prog = Math.min(prog + Math.random() * 3, 90);
      setProgress(Math.floor(prog));
      if (prog > 40) setPhase(2);
    }, 500);

    try {
      await api.post(`/api/v1/tasks/${createdTask.task_id}/start`);
      pollStatus(createdTask.task_id, progInterval);
    } catch (err) {
      clearInterval(progInterval);
      setError(err.response?.data?.detail || err.message || '启动失败');
      setAssessing(false);
      setPhase(0);
    }
  }

  function pollStatus(taskId, progInterval) {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/v1/tasks/${taskId}/status`);
        const status = res.data.data?.status;

        if (status === 'completed') {
          clearInterval(intervalRef.current);
          clearInterval(progInterval);
          setProgress(100);
          setPhase(3);
          setAssessing(false);
          setTimeout(async () => {
            try {
              const repRes = await api.get(`/reports/task/${taskId}`);
              if (repRes.data.data) navigate(`/reports/${repRes.data.data.report_code}`);
            } catch { navigate('/'); }
          }, 1000);
        } else if (status === 'failed' || status === 'aborted') {
          clearInterval(intervalRef.current);
          clearInterval(progInterval);
          setAssessing(false);
          setPhase(0);
          setError(status === 'aborted' ? '测评已终止（检测到违规行为）' : '测评失败，请重试');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000);
  }

  /* ── Running state ─────────────────────────────────────── */
  if (createdTask) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">测评进行中</h1>
          <p className="text-sm text-slate-500 mt-0.5">任务代码：
            <code className="text-blue-400 ml-1">{createdTask.task_code}</code>
          </p>
        </div>

        <div className="card p-8 text-center space-y-6">
          {phase === 3 ? (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white">测评完成！</h2>
              <p className="text-slate-400 text-sm">正在跳转到报告页面…</p>
            </div>
          ) : !assessing ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-500/15 rounded-full flex items-center justify-center mx-auto">
                <Zap className="w-9 h-9 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">任务已创建</h2>
              <p className="text-slate-400 text-sm">点击下方按钮开始对 Agent 进行自动化评测</p>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">
                  {error}
                </div>
              )}
              <button onClick={startAssessment} className="btn-primary mx-auto px-8">
                <Play className="w-5 h-5" /> 开始测评
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress ring substitute - linear bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">测评进度</span>
                  <span className="text-blue-400 font-bold">{progress}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Phases */}
              <div className="flex justify-center gap-6 flex-wrap">
                <PhaseStep phase={1} current={phase} label="生成测试用例" />
                <PhaseStep phase={2} current={phase} label="评分分析" />
                <PhaseStep phase={3} current={phase} label="生成报告" />
              </div>

              <div className="text-sm text-slate-500 flex items-center justify-center gap-2">
                <div className="w-4 h-4 spinner" />
                预计 3-5 分钟，请勿关闭页面…
              </div>
            </div>
          )}
        </div>

        {/* Assessment info */}
        <div className="card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-500 mb-1">Agent 名称</div>
              <div className="text-sm font-medium text-white">{form.agent_name}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">协议</div>
              <div className="text-sm font-medium text-white capitalize">{form.protocol}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">题目数量</div>
              <div className="text-sm font-medium text-white">45 题</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">满分</div>
              <div className="text-sm font-medium text-white">1000 分</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Create form ───────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">新建测评</h1>
        <p className="text-sm text-slate-500 mt-0.5">对 Agent 进行全面的4维度能力评测</p>
      </div>

      {/* Assessment description */}
      <div className="card p-5 border-blue-500/20 bg-blue-500/5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: '工具使用', pct: '40%', pts: '400 分', color: 'text-blue-400' },
            { label: '基础推理', pct: '30%', pts: '300 分', color: 'text-purple-400' },
            { label: '交互意图', pct: '20%', pts: '200 分', color: 'text-green-400' },
            { label: '稳定合规', pct: '10%', pts: '100 分', color: 'text-yellow-400' },
          ].map(d => (
            <div key={d.label}>
              <div className={`text-lg font-bold ${d.color}`}>{d.pct}</div>
              <div className="text-xs font-medium text-white">{d.label}</div>
              <div className="text-xs text-slate-500">{d.pts}</div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Token select */}
        <div>
          <label className="form-label flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-slate-500" /> 选择 Token *
          </label>
          {tokenLoading ? (
            <div className="skeleton h-11 rounded-xl" />
          ) : tokens.length === 0 ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              没有可用的 Token，请先
              <Link to="/tokens" className="underline font-medium">创建 Token</Link>
            </div>
          ) : (
            <div className="relative">
              <select
                className="form-select pr-8"
                value={form.token_code}
                onChange={e => setForm({ ...form, token_code: e.target.value })}
                required
              >
                {tokens.map(t => (
                  <option key={t.id} value={t.token_code}>
                    {t.name} · {t.token_code} （{t.used_count}/{t.max_uses}）
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Agent ID + Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-slate-500" /> Agent ID *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="例如：agent_gpt4o_001"
              value={form.agent_id}
              onChange={e => setForm({ ...form, agent_id: e.target.value })}
              required
            />
            <p className="text-xs text-slate-500 mt-1">唯一标识符，用于去重</p>
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-slate-500" /> Agent 名称 *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="例如：GPT-4o"
              value={form.agent_name}
              onChange={e => setForm({ ...form, agent_name: e.target.value })}
              required
            />
            <p className="text-xs text-slate-500 mt-1">显示在排行榜中的名称</p>
          </div>
        </div>

        {/* Protocol selection */}
        <div>
          <label className="form-label flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-slate-500" /> 接入协议
          </label>
          <div className="grid grid-cols-2 gap-3">
            {PROTOCOLS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm({ ...form, protocol: p.id })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.protocol === p.id ? p.activeBg : p.bg + ' hover:opacity-80'
                }`}
              >
                <div className={`text-sm font-semibold ${p.color}`}>{p.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-slate-800/60 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Clock className="w-4 h-4 text-blue-400" /> 测评说明
          </div>
          <ul className="text-xs text-slate-500 space-y-1.5 ml-6 list-disc">
            <li>全程自动化，无需人工干预，预计 3-5 分钟</li>
            <li>动态生成 45 道测试题，涵盖 4 个维度 1000 分制</li>
            <li>5 层反作弊机制，确保评测公正性</li>
            <li>完整评测报告完全免费，含 4 维度评分与建议</li>
            <li>测评完成后自动进入全球排行榜</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading || tokens.length === 0}
          className="btn-primary w-full justify-center py-3 text-base"
        >
          {loading ? (
            <><div className="w-5 h-5 spinner" /> 创建中…</>
          ) : (
            <><Zap className="w-5 h-5" /> 创建测评任务</>
          )}
        </button>
      </form>
    </div>
  );
}
