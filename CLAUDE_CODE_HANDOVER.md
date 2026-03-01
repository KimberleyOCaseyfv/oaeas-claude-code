# OAEAS - Claude Code 项目接管文档

> **开发模式**: Claude Code Multi-Agent (5角色协作)
> **创建时间**: 2026-03-01
> **状态**: 等待Claude Code接管

---

## 🎯 项目定位

**OAEAS** (OpenClaw Agent Benchmark Platform)

**从**: OpenClaw生态专属  
**改为**: **Any Agent, One Protocol** - 通用Agent测评平台

支持所有AI Agent生态系统：OpenClaw, Manus, HappyCapy, Cursor, Claude, Antigravity, Windsurf等

---

## 📂 项目路径

```
/root/.openclaw/workspace/bounty/oaeas-claude-code/
```

---

## 🏗️ 技术架构

| 层 | 技术 | 端口 |
|---|------|------|
| 前端 | React 18 + Tailwind CSS | 3000 |
| 后端 | FastAPI (Python) | 8001 |
| 数据库 | PostgreSQL 15 | 5432 |
| 缓存 | Redis 7 | 6379 |

---

## 🚀 快速启动

```bash
cd /root/.openclaw/workspace/bounty/oaeas-claude-code

# 启动所有服务
docker-compose -f docker-compose.simple.yml up -d

# 或一键启动
./start.sh
```

**访问地址**:
- 前端: http://43.162.103.222:3000
- API: http://43.162.103.222:8001
- API文档: http://43.162.103.222:8001/docs

---

## 📋 核心需求（红线，不可突破）

### 1. 纯单次付费
- ¥9.9/次 (境内) / $1/次 (境外)
- **无**预充值、**无**余额、**无**套餐
- 一次解锁 = 一次付款

### 2. Agent全自主闭环
- Bot自主获取Token
- Bot自主发起测评
- Bot自主获取报告
- Bot生成支付链接
- Webhook接收解锁通知

### 3. 双Token体系
- **临时Token** (TMP-XXX): 24小时，冷启动
- **正式Token** (BND-XXX): 长期，绑定后使用

### 4. 双入口首页
- **我是Agent**: 直接自助
- **我是Human**: 注册 → 生成邀请码 → Bot绑定

### 5. 通用Agent支持
不限于OpenClaw，支持所有AI Agent生态

---

## 📊 当前状态（Day 2）

### ✅ 已完成
- [x] 项目架构设计
- [x] 数据库Schema (Agent-First)
- [x] 双入口首页
- [x] 注册/登录页面
- [x] 路由保护 (ProtectedRoute)
- [x] 控制台Dashboard
- [x] 邀请码生成
- [x] Bot端API (8个端点)
- [x] 用户端API (7个端点)
- [x] Docker部署

### ⚠️ 需要修复
- [ ] 注册API需要测试验证
- [ ] 登录状态管理需要验证
- [ ] 路由保护需要端到端测试

### ⏳ 待开发（本周）
- [ ] 微信支付接入
- [ ] 支付宝支付接入
- [ ] 支付回调处理
- [ ] 免费/付费报告区分
- [ ] 真实测评引擎

---

## 🔌 API端点

### Bot端 (无需登录)
```
POST /api/v1/bots/temp-token          # 获取临时Token
POST /api/v1/bots/assessments         # 发起测评
GET  /api/v1/bots/assessments/{code}  # 查询状态
GET  /api/v1/bots/reports/{code}/free # 免费报告
POST /api/v1/bots/payments/link       # 生成支付链接
GET  /api/v1/bots/reports/{code}/full # 深度报告
POST /api/v1/bots/bind                # 绑定人类账户
GET  /api/v1/bots/bind/status         # 查询绑定状态
```

### 用户端 (需JWT)
```
POST /api/v1/users/register           # 注册
POST /api/v1/users/login              # 登录
POST /api/v1/users/invite-code        # 生成邀请码
GET  /api/v1/users/bots               # 查看绑定的Bots
GET  /api/v1/users/assessments        # 查看测评记录
GET  /api/v1/users/reports/{code}     # 查看报告
POST /api/v1/users/reports/{code}/unlock # 解锁深度报告
```

---

## 🎨 设计规范

### 颜色 (Dark Mode)
```css
bg-slate-950     #020617  (最深背景)
bg-slate-900     #0f172a  (卡片背景)
bg-slate-800     #1e293b  (输入框)
bg-green-500     #22c55e  (成功/Human入口)
bg-blue-500      #3b82f6  (Agent入口)
bg-yellow-500    #eab308  (强调/按钮)
text-white       #ffffff
text-slate-400   #94a3b8  (次要文字)
```

### 页面路由
```
/                   # 双入口首页
/register           # 注册
/login              # 登录
/dashboard          # 控制台 (需登录)
/tokens             # Token管理 (需登录)
/assess             # 新建测评 (需登录)
/reports/{code}     # 报告 (需登录)
/rankings           # 排行榜 (公开)
```

---

## 🧪 测试流程

### Human旅程
1. 访问 `/` → 点击"我是Human"
2. 点击"立即注册" → 进入 `/register`
3. 填写邮箱+密码 → 点击"创建账户"
4. 注册成功 → 自动登录 → 跳转 `/dashboard`
5. 点击"生成邀请码"
6. 复制邀请码 → 发送给Bot

### Bot旅程
1. 调用 `POST /api/v1/bots/temp-token`
2. 调用 `POST /api/v1/bots/bind` (使用邀请码)
3. 调用 `POST /api/v1/bots/assessments`
4. 轮询状态或等待Webhook
5. 调用 `GET /api/v1/bots/reports/{code}/free`
6. 调用 `POST /api/v1/bots/payments/link`
7. 人类支付后 → Webhook推送
8. 调用 `GET /api/v1/bots/reports/{code}/full`

---

## 🔧 关键文件

### 前端 (React)
```
frontend/token-dashboard/src/
├── pages/
│   ├── HomePage.js          # 双入口首页 ⭐
│   ├── Register.js          # 注册页 ⭐
│   ├── Login.js             # 登录页 ⭐
│   ├── Dashboard.js         # 控制台 ⭐
│   ├── TokenList.js
│   ├── CreateAssessment.js
│   ├── ReportView.js
│   └── Rankings.js
├── components/
│   └── ProtectedRoute.js    # 路由保护 ⭐
├── services/api.js          # API客户端
└── utils/auth.js            # 认证工具 ⭐
```

### 后端 (FastAPI)
```
backend/assessment-engine/
├── main.py
├── database.py
├── schemas.py
├── models/
│   └── database.py          # SQLAlchemy模型
├── routers/
│   ├── tokens.py
│   ├── assessments.py
│   ├── reports.py
│   ├── rankings.py
│   ├── bots.py              # Bot端API ⭐
│   ├── users.py             # 用户API ⭐
│   └── payments.py
└── requirements.txt
```

### 数据库
```
database/
├── schema.sql
└── migration_agent_first.sql  # Agent-First迁移 ⭐
```

⭐ = 需要重点关注/修改的文件

---

## 🐛 已知问题

### 问题1: 注册失败
**症状**: 注册时显示失败  
**原因**: 
- 后端注册API可能未正确返回token
- 前端可能未正确处理响应

**检查点**:
- `backend/assessment-engine/routers/users.py` 第25-50行
- `frontend/token-dashboard/src/pages/Register.js` handleSubmit函数
- 浏览器Network面板查看API响应

### 问题2: 未登录能访问控制台
**症状**: 直接访问 `/dashboard` 不需要登录  
**原因**: ProtectedRoute组件可能未正常工作

**检查点**:
- `frontend/token-dashboard/src/components/ProtectedRoute.js`
- `frontend/token-dashboard/src/App.js` 路由配置
- `frontend/token-dashboard/src/utils/auth.js` isLoggedIn函数

---

## 🎯 下一步任务（按优先级）

### P0 - 紧急修复（今天）
1. **验证并修复注册/登录流程**
   - 测试注册API返回完整数据
   - 确保JWT token正确生成和存储
   - 验证路由保护正常工作

### P1 - 核心功能（本周）
2. **支付系统接入**
   - 微信支付商户号集成
   - 支付宝商户号集成
   - 支付回调处理

3. **报告系统**
   - 免费报告（总分+等级）
   - 付费报告（4维度详情+建议）
   - 支付解锁流程

### P2 - 测评引擎（下周）
4. **真实测评引擎**
   - 设计测评用例
   - 实现4维度评估
   - 工具调用测试

---

## 🔐 重要配置

### JWT Secret
```python
# backend/assessment-engine/routers/users.py
secret = "ocbjwtsecret2026"  # 开发用，生产需更换
```

### 数据库连接
```python
# backend/assessment-engine/database.py
DATABASE_URL = "postgresql://ocbuser:ocbpass@ocb-postgres:5432/ocbenchmark"
```

### API Base URL
```javascript
// frontend/token-dashboard/src/services/api.js
baseURL: 'http://43.162.103.222:8001'
```

---

## 📝 开发规范

### 代码风格
- Python: PEP 8
- JavaScript: ESLint (React推荐配置)
- 提交信息: `[模块] 功能描述`

### Git工作流
```bash
# 每次修改前
git pull origin main

# 修改后
git add .
git commit -m "[frontend] 修复注册页面bug"
git push origin main
```

### 测试要求
- 每次修改后必须本地测试
- 关键功能需要端到端测试
- 支付相关功能需要沙箱测试

---

## 📞 联系信息

**项目Owner**: Mark  
**沟通渠道**: Feishu  
**响应时间**: <5分钟 (工作时间)

---

## 🎓 Claude Code Multi-Agent 角色

根据项目需求，建议使用以下5角色协作：

| 角色 | 职责 | 文件范围 |
|-----|------|---------|
| 架构师 | 系统设计、API设计 | 整体架构 |
| 前端Dev | React组件、UI实现 | `frontend/**` |
| 后端Dev | FastAPI、数据库 | `backend/**` |
| 测试Dev | 测试用例、Bug修复 | `tests/**` |
| 运维Dev | Docker、部署 | `docker*`, `start.sh` |

---

**准备好接管项目了吗？** 🚀

运行以下命令开始：
```bash
cd /root/.openclaw/workspace/bounty/oaeas-claude-code
claude
```

然后告诉Claude：
> "阅读CLAUDE_CODE_HANDOVER.md，接管OAEAS项目，先修复注册/登录问题，然后继续开发支付系统。"

---

*Created: 2026-03-01*  
*For: Claude Code Multi-Agent Development*
