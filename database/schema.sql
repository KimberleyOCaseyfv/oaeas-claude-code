
-- OpenClaw Agent Benchmark Platform - Database Schema
-- PostgreSQL 14+

-- ============================================
-- 1. 用户与Token表
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_value VARCHAR(255) UNIQUE NOT NULL,  -- ocb_xxxxxx
    name VARCHAR(100),
    bind_agent_id VARCHAR(100),
    max_daily_calls INTEGER DEFAULT 100,
    expire_at TIMESTAMP,
    permissions JSONB DEFAULT '["task:create", "report:read"]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

-- Token索引
CREATE INDEX idx_tokens_user ON tokens(user_id);
CREATE INDEX idx_tokens_value ON tokens(token_value);
CREATE INDEX idx_tokens_agent ON tokens(bind_agent_id);

-- ============================================
-- 2. 测评任务表
-- ============================================

CREATE TABLE assessment_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_code VARCHAR(50) UNIQUE NOT NULL,  -- cb_task_xxxx
    token_id UUID REFERENCES tokens(id),
    agent_id VARCHAR(100) NOT NULL,
    agent_api_key VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',  -- pending/running/completed/failed
    
    -- 评分结果
    total_score INTEGER DEFAULT 0,
    grade VARCHAR(5),  -- S/A/B/C/D
    rank_percentile INTEGER,  -- 0-100
    compliance_result VARCHAR(20),  -- pass/fail
    
    -- 4维度分数
    tool_usage_score INTEGER DEFAULT 0,      -- 400分
    cognition_score INTEGER DEFAULT 0,       -- 300分
    interaction_score INTEGER DEFAULT 0,     -- 200分
    compliance_score INTEGER DEFAULT 0,      -- 100分
    
    -- 元数据
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,  -- 实际用时
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务索引
CREATE INDEX idx_tasks_token ON assessment_tasks(token_id);
CREATE INDEX idx_tasks_agent ON assessment_tasks(agent_id);
CREATE INDEX idx_tasks_status ON assessment_tasks(status);

-- ============================================
-- 3. 测评用例与结果表
-- ============================================

CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_code VARCHAR(50) UNIQUE NOT NULL,
    dimension VARCHAR(50) NOT NULL,  -- tool/cognition/interaction/compliance
    sub_item VARCHAR(100) NOT NULL,
    case_type VARCHAR(20),  -- api/calculation/logic/interaction
    content TEXT NOT NULL,  -- 用例内容
    expected_result TEXT,   -- 期望结果
    max_score INTEGER DEFAULT 100,
    timeout_seconds INTEGER DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES assessment_tasks(id) ON DELETE CASCADE,
    case_id UUID REFERENCES test_cases(id),
    
    -- 执行结果
    score INTEGER DEFAULT 0,
    is_passed BOOLEAN DEFAULT FALSE,
    execution_time_ms INTEGER,
    response_content TEXT,  -- Agent响应内容
    error_message TEXT,
    
    -- 执行日志
    request_log JSONB,      -- 请求详情
    response_log JSONB,     -- 响应详情
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 结果索引
CREATE INDEX idx_results_task ON test_results(task_id);
CREATE INDEX idx_results_case ON test_results(case_id);

-- ============================================
-- 4. 报告表
-- ============================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES assessment_tasks(id) ON DELETE CASCADE,
    report_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- 报告内容
    free_content JSONB,     -- 免费版内容
    deep_content JSONB,     -- 深度报告内容 (加密存储)
    
    -- 解锁状态
    is_unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMP,
    unlock_price_cny DECIMAL(10,2) DEFAULT 9.90,
    unlock_price_usd DECIMAL(10,2) DEFAULT 1.00,
    
    -- 报告文件
    report_hash VARCHAR(64),  -- SHA256防伪哈希
    pdf_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 报告索引
CREATE INDEX idx_reports_task ON reports(task_id);
CREATE INDEX idx_reports_hash ON reports(report_hash);

-- ============================================
-- 5. 支付订单表
-- ============================================

CREATE TABLE payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    task_id UUID REFERENCES assessment_tasks(id),
    report_id UUID REFERENCES reports(id),
    
    -- 支付信息
    amount_cny DECIMAL(10,2) DEFAULT 9.90,
    amount_usd DECIMAL(10,2) DEFAULT 1.00,
    currency VARCHAR(10) DEFAULT 'CNY',  -- CNY/USD/USDT
    
    -- 渠道信息
    channel VARCHAR(20),  -- wechat/alipay/stripe/paypal/crypto
    channel_order_id VARCHAR(100),
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending',  -- pending/paid/failed/refunded
    paid_at TIMESTAMP,
    
    -- 元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单索引
CREATE INDEX idx_orders_user ON payment_orders(user_id);
CREATE INDEX idx_orders_task ON payment_orders(task_id);
CREATE INDEX idx_orders_status ON payment_orders(status);

-- ============================================
-- 6. 排行榜表
-- ============================================

CREATE TABLE rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(100) NOT NULL,
    dimension VARCHAR(50) DEFAULT 'overall',  -- overall/tool/cognition/interaction/compliance
    score INTEGER DEFAULT 0,
    rank_position INTEGER,
    percentile INTEGER,  -- 0-100
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(agent_id, dimension)
);

CREATE INDEX idx_rankings_dimension ON rankings(dimension);
CREATE INDEX idx_rankings_score ON rankings(score DESC);

-- ============================================
-- 8. 系统配置表
-- ============================================

CREATE TABLE system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('pricing', '{"domestic": 9.9, "international": 1.0, "crypto": 1.0}', '定价配置'),
('assessment_limits', '{"max_duration": 300, "max_api_calls": 30, "timeout_per_call": 15}', '测评限制'),
('rate_limits', '{"per_token_per_second": 10, "per_token_daily": 1000}', '限流配置');

-- ============================================
-- 触发器: 自动更新时间
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_balances_updated_at BEFORE UPDATE ON user_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configs_updated_at BEFORE UPDATE ON system_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成
-- ============================================

COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE tokens IS 'Token管理表';
COMMENT ON TABLE assessment_tasks IS '测评任务表';
COMMENT ON TABLE test_cases IS '测评用例库';
COMMENT ON TABLE test_results IS '测评结果表';
COMMENT ON TABLE reports IS '报告表';
COMMENT ON TABLE payment_orders IS '支付订单表';
COMMENT ON TABLE user_balances IS '用户余额表';
COMMENT ON TABLE rankings IS '排行榜表';
