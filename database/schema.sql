-- OAEAS V2 Database Schema
-- PostgreSQL 15

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CORE USER TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    name                VARCHAR(255),
    magic_link_token    VARCHAR(128),
    magic_link_expires  TIMESTAMP WITH TIME ZONE,
    last_login_at       TIMESTAMP WITH TIME ZONE,
    login_count         INTEGER DEFAULT 0,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TOKEN TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_code  VARCHAR(20) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type  VARCHAR(50) DEFAULT 'general',
    status      VARCHAR(50) DEFAULT 'active',
    max_uses    INTEGER DEFAULT 100,
    used_count  INTEGER DEFAULT 0,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at  TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS anonymous_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_value VARCHAR(64) UNIQUE NOT NULL,
    agent_id    VARCHAR(128) NOT NULL,
    agent_name  VARCHAR(255),
    protocol    VARCHAR(32) DEFAULT 'openai',
    ip_address  INET,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    task_id     UUID,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_anon_tokens_agent_id ON anonymous_tokens(agent_id);
CREATE INDEX IF NOT EXISTS idx_anon_tokens_expires  ON anonymous_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_anon_tokens_value    ON anonymous_tokens(token_value);

CREATE TABLE IF NOT EXISTS token_usage_logs (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id   VARCHAR(128) NOT NULL,
    token_type VARCHAR(20) NOT NULL,
    action     VARCHAR(64) NOT NULL,
    ip_address INET,
    user_agent VARCHAR(512),
    metadata   JSONB DEFAULT '{}',
    logged_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_usage_logs_token ON token_usage_logs(token_id, logged_at);

-- ============================================================
-- AGENT PROTOCOL CONFIG
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_protocols (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id     UUID REFERENCES tokens(id),
    protocol     VARCHAR(32) NOT NULL,
    endpoint_url VARCHAR(512),
    auth_header  VARCHAR(512),
    config       JSONB DEFAULT '{}',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BINDING TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS invite_codes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code          VARCHAR(20) UNIQUE NOT NULL,
    human_user_id UUID NOT NULL REFERENCES users(id),
    used          BOOLEAN DEFAULT FALSE,
    used_by_agent VARCHAR(128),
    expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invite_codes_user ON invite_codes(human_user_id);

CREATE TABLE IF NOT EXISTS bot_human_bindings (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    human_user_id  UUID NOT NULL REFERENCES users(id),
    agent_token_id UUID REFERENCES tokens(id),
    anon_token_id  UUID REFERENCES anonymous_tokens(id),
    invite_code    VARCHAR(20) NOT NULL,
    status         VARCHAR(32) DEFAULT 'pending_confirm',
    agent_id       VARCHAR(128),
    initiated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at   TIMESTAMP WITH TIME ZONE,
    expires_at     TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bindings_user ON bot_human_bindings(human_user_id);

-- ============================================================
-- ASSESSMENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS assessment_tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_code       VARCHAR(30) UNIQUE NOT NULL,
    token_id        UUID REFERENCES tokens(id),
    anon_token_id   UUID REFERENCES anonymous_tokens(id),
    agent_id        VARCHAR(128) NOT NULL,
    agent_name      VARCHAR(255) NOT NULL,
    agent_protocol  VARCHAR(32) DEFAULT 'openai',
    endpoint_url    VARCHAR(512),
    auth_header     VARCHAR(512),
    seed            BIGINT,
    status          VARCHAR(32) DEFAULT 'pending',
    phase           INTEGER DEFAULT 0,
    cases_total     INTEGER DEFAULT 45,
    cases_completed INTEGER DEFAULT 0,
    timeout_count   INTEGER DEFAULT 0,
    veto_triggered  BOOLEAN DEFAULT FALSE,
    veto_reason     VARCHAR(512),
    anti_cheat_flags JSONB DEFAULT '[]',
    tool_score      DECIMAL(8,2) DEFAULT 0,
    reasoning_score DECIMAL(8,2) DEFAULT 0,
    interaction_score DECIMAL(8,2) DEFAULT 0,
    stability_score DECIMAL(8,2) DEFAULT 0,
    total_score     DECIMAL(8,2) DEFAULT 0,
    level           VARCHAR(32),
    duration_seconds INTEGER,
    webhook_url     VARCHAR(512),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at      TIMESTAMP WITH TIME ZONE,
    completed_at    TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON assessment_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON assessment_tasks(status);

CREATE TABLE IF NOT EXISTS test_cases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_type       VARCHAR(50) NOT NULL,
    difficulty      VARCHAR(20) DEFAULT 'medium',
    content         JSONB NOT NULL,
    expected_result JSONB,
    weight          DECIMAL(3,2) DEFAULT 1.0,
    tags            JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS test_results (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id          UUID REFERENCES assessment_tasks(id),
    case_id          UUID REFERENCES test_cases(id),
    dimension        VARCHAR(32),
    difficulty       VARCHAR(20),
    status           VARCHAR(32),
    score            DECIMAL(8,2) DEFAULT 0,
    max_score        DECIMAL(8,2) DEFAULT 0,
    response_time_ms INTEGER,
    actual_result    JSONB,
    error_message    TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_results_task ON test_results(task_id);

CREATE TABLE IF NOT EXISTS sandbox_executions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id       UUID NOT NULL REFERENCES assessment_tasks(id),
    case_id       UUID,
    tool_name     VARCHAR(64) NOT NULL,
    input_params  JSONB,
    output_result JSONB,
    duration_ms   INTEGER,
    success       BOOLEAN,
    error_message TEXT,
    called_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sandbox_task ON sandbox_executions(task_id);

CREATE TABLE IF NOT EXISTS anti_cheat_logs (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id    UUID NOT NULL REFERENCES assessment_tasks(id),
    layer      INTEGER NOT NULL,
    check_type VARCHAR(64) NOT NULL,
    result     VARCHAR(20) NOT NULL,
    evidence   TEXT,
    metadata   JSONB DEFAULT '{}',
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_anticheat_task ON anti_cheat_logs(task_id);

-- ============================================================
-- REPORT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_code      VARCHAR(30) UNIQUE NOT NULL,
    task_id          UUID REFERENCES assessment_tasks(id),
    summary          JSONB,
    dimensions       JSONB,
    test_cases       JSONB DEFAULT '[]',
    recommendations  JSONB DEFAULT '[]',
    is_deep_report   INTEGER DEFAULT 0,
    report_hash      VARCHAR(80),
    bot_payload      JSONB,
    human_html_url   VARCHAR(512),
    pdf_url          VARCHAR(512),
    payment_order_id UUID,
    unlocked_at      TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_hashes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id       UUID UNIQUE NOT NULL REFERENCES reports(id),
    hash_value      VARCHAR(80) NOT NULL,
    hash_algorithm  VARCHAR(20) DEFAULT 'sha256',
    signed_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payload_size    INTEGER
);

-- ============================================================
-- PAYMENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_orders (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code    VARCHAR(40) UNIQUE NOT NULL,
    report_id     UUID REFERENCES reports(id),
    user_id       UUID REFERENCES users(id),
    anon_token_id UUID REFERENCES anonymous_tokens(id),
    amount        DECIMAL(10,2) NOT NULL,
    currency      VARCHAR(10) DEFAULT 'CNY',
    channel       VARCHAR(20),
    status        VARCHAR(20) DEFAULT 'pending',
    qr_url        VARCHAR(512),
    paid_at       TIMESTAMP WITH TIME ZONE,
    expires_at    TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_report ON payment_orders(report_id);

-- ============================================================
-- WEBHOOK TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id      UUID NOT NULL REFERENCES assessment_tasks(id),
    endpoint_url VARCHAR(512) NOT NULL,
    secret       VARCHAR(128),
    events       JSONB DEFAULT '["task.completed"]',
    active       BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- RANKING TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS rankings (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id   VARCHAR(128),
    agent_name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(50) DEFAULT 'general',
    protocol   VARCHAR(32),
    total_score DECIMAL(8,2) DEFAULT 0,
    level      VARCHAR(32),
    rank       INTEGER,
    task_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rankings_score ON rankings(total_score DESC);

-- ============================================================
-- SYSTEM CONFIG
-- ============================================================

CREATE TABLE IF NOT EXISTS system_config (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_config (key, value, description) VALUES
    ('assessment_timeout_seconds', '300', 'Total assessment timeout'),
    ('round_timeout_seconds', '15', 'Per-round timeout'),
    ('anon_token_ttl_seconds', '7200', 'Anonymous token TTL (2h)'),
    ('invite_code_ttl_hours', '24', 'Invite code TTL'),
    ('payment_order_ttl_minutes', '30', 'Payment order TTL'),
    ('deep_report_price_cny', '9.9', 'Deep report price CNY'),
    ('deep_report_price_usd', '1.0', 'Deep report price USD'),
    ('ip_rate_limit_per_hour', '10', 'Anon token requests per IP/hour'),
    ('agent_rate_limit_per_day', '5', 'Anon token requests per agent/day')
ON CONFLICT (key) DO NOTHING;
