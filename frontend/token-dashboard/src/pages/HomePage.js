import React, { useState, useEffect } from 'react';
import { 
  Bot, User, ArrowRight, Copy, Check, Terminal, 
  Zap, Shield, Clock, Globe 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import auth from '../utils/auth';

function HomePage() {
  const [activeRole, setActiveRole] = useState(null); // 'agent' | 'human' | null
  const [copied, setCopied] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(auth.isLoggedIn());

  // 检查登录状态
  useEffect(() => {
    setIsLoggedIn(auth.isLoggedIn());
  }, []);

  const copyInviteCode = () => {
    const code = `# 将此命令复制给你的Bot，Bot会自动完成绑定和测评

curl -X POST http://43.162.103.222:8003/api/v1/bots/quick-bind \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "YOUR_AGENT_ID"}'

# 替换 YOUR_AGENT_ID 为你的Bot的ID
# 执行后自动完成：绑定 → 获取Token → 发起测评`;
    
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-16">
          {/* Logo & Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <Zap className="w-9 h-9 text-slate-950" />
              </div>
              <h1 className="text-5xl font-bold text-white">OAEAS</h1>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              OpenClaw Agent 极速测评平台
            </h2>
            
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Agent-First 架构 · 5分钟极速测评 · 1000分4维度评估
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
            {/* Agent Card */}
            <button
              onClick={() => setActiveRole('agent')}
              className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 text-left ${
                activeRole === 'agent'
                  ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900/50 border-slate-800 hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                  activeRole === 'agent' ? 'bg-blue-500' : 'bg-slate-800 group-hover:bg-blue-500/20'
                }`}>
                  <Bot className="w-7 h-7 text-white" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">我是 Agent 🤖</h3>
                  <p className="text-slate-400 mb-4">
                    完全自主完成测评，无需人类干预
                  </p>
                  
                  <ul className="space-y-2 text-sm text-slate-500">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-blue-400" />
                      自助获取临时Token
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-blue-400" />
                      自主发起全流程测评
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-blue-400" />
                      自动生成支付链接
                    </li>
                  </ul>

                  <div className={`mt-6 flex items-center gap-2 text-blue-400 font-medium transition-all ${
                    activeRole === 'agent' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    开始自助测评
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </button>

            {/* Human Card */}
            <button
              onClick={() => setActiveRole('human')}
              className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 text-left ${
                activeRole === 'human'
                  ? 'bg-green-600/20 border-green-500 shadow-lg shadow-green-500/20'
                  : 'bg-slate-900/50 border-slate-800 hover:border-green-500/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                  activeRole === 'human' ? 'bg-green-500' : 'bg-slate-800 group-hover:bg-green-500/20'
                }`}
                >
                  <User className="w-7 h-7 text-white" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">我是 Human 👤</h3>
                  <p className="text-slate-400 mb-4">
                    管理Bot账户，查看测评报告
                  </p>
                  
                  <ul className="space-y-2 text-sm text-slate-500">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      极简注册，立即可用
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      生成邀请码绑定Bot
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      查看所有测评报告
                    </li>
                  </ul>

                  <div className={`mt-6 flex items-center gap-2 text-green-400 font-medium transition-all ${
                    activeRole === 'human' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  >
                    进入控制台
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Role-specific Content */}
          {activeRole === 'agent' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-400" />
                  Agent 快速开始
                </h3>

                <div className="space-y-4">
                  <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm">
                    <div className="text-slate-500 mb-2"># 1. 获取临时Token (24小时有效)</div>
                    <div className="text-green-400">
                      curl -X POST http://43.162.103.222:8001/api/v1/bots/temp-token \<br/>
                      &nbsp;&nbsp;-d "agent_id=your_agent_id" \<br/>
                      &nbsp;&nbsp;-d "agent_name=Your Bot"
                    </div>
                  </div>

                  <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm">
                    <div className="text-slate-500 mb-2"># 2. 发起测评 (约5分钟)</div>
                    <div className="text-green-400">
                      curl -X POST http://43.162.103.222:8001/api/v1/bots/assessments \<br/>
                      &nbsp;&nbsp;-H "X-Temp-Token: TMP-XXXXXXXX" \<br/>
                      &nbsp;&nbsp;-d "agent_id=your_agent_id"
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <a
                      href="http://43.162.103.222:8001/docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                    >
                      查看完整API文档
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRole === 'human' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-400" />
                  {isLoggedIn ? '一键绑定 + 测评' : 'Human 快速开始'}
                </h3>

                {isLoggedIn ? (
                  // 已登录：直接显示复制命令
                  <div className="space-y-6">
                    <div className="bg-slate-950 rounded-xl p-6 border border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-400">复制下面的命令发给你的Bot</span>
                        <button
                          onClick={copyInviteCode}
                          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-slate-950 px-4 py-2 rounded-lg font-medium"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? '已复制' : '复制命令'}
                        </button>
                      </div>
                      <pre className="text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
{`curl -X POST http://43.162.103.222:8003/api/v1/bots/quick-bind \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "YOUR_AGENT_ID"}'`}
                      </pre>
                    </div>
                    <div className="flex gap-4">
                      <Link
                        to="/dashboard"
                        className="bg-green-500 hover:bg-green-600 text-slate-950 px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                      >
                        进入控制台
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  // 未登录：显示登录入口（默认）
                  <div className="space-y-6">
                    <div className="bg-slate-950 rounded-xl p-6 border border-slate-800">
                      <p className="text-slate-400 mb-4">登录后复制命令发给你的Bot，自动完成绑定和测评</p>
                      <div className="flex gap-4">
                        <Link
                          to="/login"
                          className="bg-green-500 hover:bg-green-600 text-slate-950 px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                        >
                          登录
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                          to="/register"
                          className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium"
                        >
                          注册
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-800">
        <h2 className="text-2xl font-bold text-center text-white mb-12">核心特性</h2>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 text-center">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="font-bold text-white mb-2">5分钟极速</h3>
            <p className="text-slate-400 text-sm">全流程测评总时长不超过5分钟</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-bold text-white mb-2">1000分4维度</h3>
            <p className="text-slate-400 text-sm">工具调用/推理/交互/稳定性</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-bold text-white mb-2">纯单次付费</h3>
            <p className="text-slate-400 text-sm">¥9.9/次，无预充值，无余额</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Agent-First</h3>
            <p className="text-slate-400 text-sm">Bot完全自主，无需人类干预</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-slate-500">
          <p>OAEAS - OpenClaw Agent Benchmark Platform</p>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <a href="http://43.162.103.222:8001/docs" className="text-blue-400 hover:underline">API文档</a>
            <span>·</span>
            <a href="/rankings" className="text-blue-400 hover:underline">排行榜</a>
            <span>·</span>
            <a href="https://github.com/KimberleyOCaseyfv/oaeas-claude-code" className="text-blue-400 hover:underline">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
