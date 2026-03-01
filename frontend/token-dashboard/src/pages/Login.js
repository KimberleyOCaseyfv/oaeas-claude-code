import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';
import api from '../services/api';

/* ─── States ───────────────────────────────────────────────── */
// 'idle' → 'sent' → 'verified'

export default function Login() {
  const { isAuth, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/console/dashboard';

  const [step, setStep] = useState('idle');   // idle | sent | verifying
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (isAuth) navigate(from, { replace: true });
  }, [isAuth, navigate, from]);

  // Check for magic link token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) verifyToken(token);
  }, []);

  async function sendMagicLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post('/api/v1/human/auth/magic-link', { email });
      setStep('sent');
      toast.success('魔法链接已发送！');
    } catch (err) {
      const msg = err.response?.data?.error?.message || '发送失败，请重试';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function verifyToken(token) {
    setStep('verifying');
    try {
      const res = await api.get(`/api/v1/human/auth/verify?token=${token}`);
      const { access_token, user } = res.data.data;
      login(access_token, user);
      toast.success('登录成功！');
      navigate(from, { replace: true });
    } catch {
      toast.error('链接已失效，请重新发送');
      setStep('idle');
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
         style={{ background: 'var(--color-bg-void)' }}>
      {/* BG effect */}
      <div className="fixed inset-0 pointer-events-none"
           style={{
             backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
             backgroundSize: '40px 40px', opacity: 0.15,
           }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">OAEAS</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">欢迎回来</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>通过邮件魔法链接登录控制台</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7 space-y-5"
             style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>

          {step === 'idle' && (
            <form onSubmit={sendMagicLink} className="space-y-4">
              <div>
                <label className="form-label">邮箱地址</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                  <input
                    type="email"
                    className="form-input pl-9"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? (
                  <><div className="w-4 h-4 spinner" /> 发送中…</>
                ) : (
                  <>发送魔法链接</>
                )}
              </button>
            </form>
          )}

          {step === 'sent' && (
            <div className="text-center py-2 space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                   style={{ background: 'rgba(37,99,235,0.12)' }}>
                <Mail className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">邮件已发送！</h3>
                <p className="text-sm" style={{ color: '#64748b' }}>
                  魔法链接已发送至<br />
                  <strong className="text-white">{email}</strong>
                  <br />15 分钟内有效
                </p>
              </div>
              <div className="text-xs" style={{ color: '#334155' }}>
                没收到邮件？检查垃圾邮件文件夹
                <br />
                <button
                  onClick={() => setStep('idle')}
                  className="mt-2 text-blue-400 hover:text-blue-300 underline"
                >
                  重新发送
                </button>
              </div>
            </div>
          )}

          {step === 'verifying' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-10 h-10 spinner mx-auto" />
              <p className="text-sm" style={{ color: '#64748b' }}>正在验证魔法链接…</p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mt-5 rounded-xl px-4 py-3 text-xs space-y-1.5"
             style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <p className="font-medium text-blue-300">关于控制台账户</p>
          <p style={{ color: '#64748b' }}>
            控制台用于<strong className="text-white">开发者管理 Bot 绑定与查看报告</strong>。
            Bot 自主评测不需要登录，直接调用 API 即可。
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="btn-ghost text-sm gap-1">
            <ArrowLeft className="w-4 h-4" /> 返回首页
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
