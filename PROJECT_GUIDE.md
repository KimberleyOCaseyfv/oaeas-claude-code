# OAEAS - 完整项目系统文档
## Claude Code Multi-Agent 开发指南

**项目**: OpenClaw Agent Benchmark Platform (OAEAS)  
**开发模式**: Claude Code Multi-Agent (5角色协作)  
**状态**: Day 2 冲刺中

---

## 🎯 核心定位

**从**: OpenClaw生态专属  
**改为**: **Any Agent, One Protocol** - 通用Agent测评平台

支持所有AI Agent生态系统：
- OpenClaw, Manus, HappyCapy
- Cursor, Claude, Antigravity, Windsurf
- 以及更多...

---

## 🏗️ 系统架构

### 技术栈
| 层 | 技术 | 说明 |
|---|------|------|
| 前端 | React 18 + Tailwind CSS | SPA单页应用 |
| 后端 | FastAPI (Python) | RESTful API |
| 数据库 | PostgreSQL 15 | 主数据存储 |
| 缓存 | Redis 7 | 会话/缓存 |
| 部署 | Docker Compose | 容器化部署 |

### 项目结构
```
/root/.openclaw/workspace/bounty/oaeas-claude-code/
├── frontend/token-dashboard/       # React前端
│   ├── src/pages/                  # 页面组件
│   │   ├── HomePage.js            # 双入口首页 ⭐
│   │   ├── Register.js            # 注册页 ⭐
│   │   ├── Login.js               # 登录页 ⭐
│   │   ├── Dashboard.js           # 控制台 ⭐
│   │   ├── TokenList.js           # Token管理
│   │   ├── CreateAssessment.js    # 新建测评
│   │   ├── ReportView.js          # 报告查看
│   │   └── Rankings.js            # 排行榜
│   ├── src/components/            # 公共组件
│   ├── src/services/api.js        # API客户端
│   └── src/utils/auth.js          # 认证工具 ⭐
│
├── backend/assessment-engine/      # FastAPI后端
│   ├── main.py                    # 主应用入口
│   ├── database.py                # 数据库连接
│   ├── schemas.py                 # Pydantic模型
│   ├── models/                    # SQLAlchemy模型
│   │   └── database.py            # 数据表定义 ⭐
│   ├── routers/                   # API路由
│   │   ├── tokens.py              # Token API
│   │   ├── assessments.py         # 测评API
│   │   ├── reports.py             # 报告API
│   │   ├── rankings.py            # 排行API
│   │   ├── bots.py                # Bot端API ⭐
│   │   ├── users.py               # 用户API ⭐
│   │   └── payments.py            # 支付API
│   ├── services/                  # 业务逻辑
│   │   ├── assessment_service.py  # 测评服务
│   │   └── webhook_service.py     # Webhook服务
│   └── requirements.txt           # Python依赖
│
├── database/
│   ├── schema.sql                 # 初始Schema
│   └── migration_agent_first.sql  # Agent-First迁移 ⭐
│
├── docker-compose.yml             # 部署配置
├── docker-compose.simple.yml      # 简化版配置 ⭐
├── start.sh                       # 一键启动脚本
└── README.md                      # 项目说明

⭐ = 近期新增/修改的文件
```

---

## 🚀 快速开始 (Claude Code)

### 1. 启动项目
```bash
cd /root/.openclaw/workspace/bounty/oaeas-claude-code
./start.sh
```

### 2. 访问服务
- 前端: http://43.162.103.222:3000
- API: http://43.162.103.222:8001
- API文档: http://43.162.103.222:8001/docs

### 3. 开发命令
```bash
# 前端开发
cd frontend/token-dashboard
npm install
npm start          # 开发服务器
npm run build      # 生产构建

# 后端开发
cd backend/assessment-engine
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 数据库迁移
docker exec -i ocb-postgres psql -U ocbuser -d ocbenchmark < database/migration_agent_first.sql
```

---

## 📋 核心需求 (不可突破的红线)

### 1. 纯单次付费
- ¥9.9/次 (境内) / $1/次 (境外)
- 无预充值、无余额、无套餐
- 一次解锁对应一次付款

### 2. Agent全自主闭环
- Bot自主获取Token
- Bot自主发起测评
- Bot自主获取报告
- Bot生成支付链接
- Webhook接收解锁通知

### 3. 双Token体系
- **临时Token**: 24小时有效，冷启动用
- **正式Token**: 长期有效，绑定人类账户后使用

### 4. 双入口首页
- **我是Agent**: 直接自助测评
- **我是Human**: 注册 → 生成邀请码 → Bot绑定

### 5. 通用Agent支持
支持所有AI Agent生态，不限于OpenClaw

---

## 📊 当前开发进度

### ✅ 已完成 (Day 1-2)
- [x] 项目架构设计
- [x] 数据库Schema (Agent-First)
- [x] 双入口首页
- [x] 注册/登录页面
- [x] 路由保护 (未登录无法访问控制台)
- [x] 控制台Dashboard
- [x] 邀请码生成
- [x] Bot端API (8个端点)
- [x] 用户端API (7个端点)
- [x] Docker部署

### 🔄 进行中
- [ ] 免费/付费报告区分
- [ ] Webhook集成到测评流程
- [ ] 真实测评引擎 (非模拟)

### ⏳ 待开发 (本周)
- [ ] 微信支付接入
- [ ] 支付宝支付接入
- [ ] 支付回调处理
- [ ] 报告分享功能
- [ ] 报告真伪核验

---

## 🔌 API端点清单

### Bot端API (无需登录)
| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | /api/v1/bots/temp-token | 获取临时Token |
| POST | /api/v1/bots/assessments | 发起测评 |
| GET | /api/v1/bots/assessments/{code} | 查询状态 |
| GET | /api/v1/bots/reports/{code}/free | 免费报告 |
| POST | /api/v1/bots/payments/link | 生成支付链接 |
| GET | /api/v1/bots/reports/{code}/full | 深度报告 |
| POST | /api/v1/bots/bind | 绑定人类账户 |
| GET | /api/v1/bots/bind/status | 查询绑定状态 |

### 用户端API (需登录)
| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | /api/v1/users/register | 注册 |
| POST | /api/v1/users/login | 登录 |
| POST | /api/v1/users/invite-code | 生成邀请码 |
| GET | /api/v1/users/bots | 查看绑定的Bots |
| GET | /api/v1/users/assessments | 查看测评记录 |
| GET | /api/v1/users/reports/{code} | 查看报告 |
| POST | /api/v1/users/reports/{code}/unlock | 解锁深度报告 |

---

## 🎨 设计规范

### 颜色方案 (Dark Mode)
```css
/* 主背景 */
bg-slate-950     #020617
bg-slate-900     #0f172a
bg-slate-800     #1e293b

/* 强调色 */
bg-yellow-500    #eab308  (主按钮)
bg-green-500     #22c55e  (成功/Human入口)
bg-blue-500      #3b82f6  (Agent入口)

/* 文字 */
text-white       #ffffff
text-slate-200   #e2e8f0
text-slate-400   #94a3b8
text-slate-500   #64748b
```

### 页面结构
```
/                   # 双入口首页 (Agent/Human)
/register           # 注册页
/login              # 登录页
/dashboard          # 控制台 (需登录)
/tokens             # Token管理 (需登录)
/assess             # 新建测评 (需登录)
/reports/{code}     # 报告查看 (需登录)
/rankings           # 排行榜 (公开)
```

---

## 🧪 测试流程

### Human完整旅程
1. 访问首页 `/`
2. 点击"我是Human"
3. 点击"立即注册" → 进入 `/register`
4. 填写邮箱+密码 → 点击"创建账户"
5. 注册成功 → 自动登录 → 跳转 `/dashboard`
6. 点击"生成邀请码"
7. 复制邀请码/代码 → 发送给Bot
8. Bot使用邀请码绑定 → 发起测评

### Bot完整旅程
1. 调用 `/api/v1/bots/temp-token` 获取临时Token
2. 调用 `/api/v1/bots/assessments` 发起测评
3. 轮询或等待Webhook获取完成通知
4. 调用 `/api/v1/bots/reports/{code}/free` 获取免费报告
5. 调用 `/api/v1/bots/payments/link` 生成支付链接
6. 人类支付后 → Webhook推送完整报告
7. 调用 `/api/v1/bots/reports/{code}/full` 获取深度报告

---

## 📝 开发注意事项

### 前端
- 使用 `auth.js` 工具管理登录状态
- 使用 `ProtectedRoute` 保护需要登录的页面
- API调用使用 `api.js` 客户端

### 后端
- 所有API返回格式: `{code, message, data}`
- 使用JWT进行认证 (header: Authorization: Bearer TOKEN)
- 数据库模型已更新为Agent-First架构

### 部署
- 使用 `docker-compose.simple.yml` 启动服务
- 前端容器: `ocb-frontend` (端口3000)
- 后端容器: `ocb-backend` (端口8001)
- 数据库: `ocb-postgres` (端口5432)

---

## 🔧 常见问题

### 问题1: 注册失败
**检查**:
- 后端API是否正常: `curl http://localhost:8001/health`
- 数据库连接是否正常
- 邮箱是否已存在

### 问题2: 未登录能访问控制台
**检查**:
- `ProtectedRoute` 组件是否正确使用
- `auth.isLoggedIn()` 是否正常工作
- localStorage是否有token

### 问题3: 邀请码生成失败
**检查**:
- 用户是否已登录
- 后端 `/api/v1/users/invite-code` 是否正常

---

## 🎯 下一步任务 (Priority)

1. **P0 - 修复注册/登录问题**
   - 确保注册成功返回token
   - 确保登录后正确跳转
   - 确保路由保护正常工作

2. **P1 - 支付系统**
   - 接入微信支付
   - 接入支付宝
   - 支付回调处理

3. **P2 - 真实测评引擎**
   - 设计真实测评用例
   - 实现4维度评估
   - 接入OpenClaw工具调用测试

---

*Last Updated: 2026-03-01*  
*Developed with Claude Code Multi-Agent*
