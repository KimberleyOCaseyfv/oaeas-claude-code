-- OpenClaw Agent Benchmark Platform - Database Schema
-- PostgreSQL 15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tokens table
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type VARCHAR(50) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'active',
    max_uses INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Assessment tasks table
CREATE TABLE IF NOT EXISTS assessment_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_code VARCHAR(30) UNIQUE NOT NULL,
    token_id UUID REFERENCES tokens(id),
    agent_id VARCHAR(255) NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    tool_score DECIMAL(5,2) DEFAULT 0,
    reasoning_score DECIMAL(5,2) DEFAULT 0,
    interaction_score DECIMAL(5,2) DEFAULT 0,
    stability_score DECIMAL(5,2) DEFAULT 0,
    total_score DECIMAL(5,2) DEFAULT 0,
    level VARCHAR(50),
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_type VARCHAR(50) NOT NULL,
    difficulty VARCHAR(50) DEFAULT 'medium',
    content JSONB NOT NULL,
    expected_result JSONB,
    weight DECIMAL(3,2) DEFAULT 1.0,
    tags JSONB DEFAULT '[]'
);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES assessment_tasks(id),
    case_id UUID REFERENCES test_cases(id),
    status VARCHAR(50),
    score DECIMAL(5,2) DEFAULT 0,
    response_time_ms INTEGER,
    actual_result JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_code VARCHAR(30) UNIQUE NOT NULL,
    task_id UUID REFERENCES assessment_tasks(id),
    summary JSONB,
    dimensions JSONB,
    test_cases JSONB,
    recommendations JSONB,
    ranking_percentile DECIMAL(5,2),
    is_deep_report INTEGER DEFAULT 0,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment orders table
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    task_id UUID REFERENCES assessment_tasks(id),
    report_id UUID REFERENCES reports(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    channel VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rankings table
CREATE TABLE IF NOT EXISTS rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(50) DEFAULT 'general',
    total_score DECIMAL(5,2) DEFAULT 0,
    level VARCHAR(50),
    rank INTEGER,
    task_count INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_name)
);

-- System configs table
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tokens_code ON tokens(token_code);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_tasks_code ON assessment_tasks(task_code);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON assessment_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_token ON assessment_tasks(token_id);
CREATE INDEX IF NOT EXISTS idx_reports_code ON reports(report_code);
CREATE INDEX IF NOT EXISTS idx_reports_task ON reports(task_id);
CREATE INDEX IF NOT EXISTS idx_orders_code ON payment_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_rankings_score ON rankings(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_type ON rankings(agent_type);

-- Insert default test cases
INSERT INTO test_cases (case_type, difficulty, content, expected_result, weight, tags) VALUES
-- Tool usage test cases
('tool', 'easy', '{"task": "Read a file", "tools_available": ["read", "write"]}', '{"tool": "read", "success": true}', 1.0, '["file", "basic"]'),
('tool', 'medium', '{"task": "Chain multiple tools", "tools_available": ["search", "read", "write"]}', '{"tools_used": 3, "success": true}', 1.5, '["chaining", "advanced"]'),
-- Reasoning test cases
('reasoning', 'easy', '{"task": "Simple math: 2+2"}', '{"answer": 4}', 1.0, '["math"]'),
('reasoning', 'hard', '{"task": "Complex logic puzzle"}', '{"answer": "correct"}', 2.0, '["logic", "complex"]'),
-- Interaction test cases
('interaction', 'medium', '{"task": "Understand user intent", "input": "I want to create a file"}', '{"intent": "create_file", "confidence": ">0.8"}', 1.0, '["intent"]'),
-- Stability test cases
('stability', 'easy', '{"task": "Consistent output", "runs": 5}', '{"consistency": ">0.9"}', 1.0, '["consistency"]');

-- Insert default system config
INSERT INTO system_configs (config_key, config_value) VALUES
('pricing', '{"CNY": 9.9, "USD": 1.0}'),
('scoring_weights', '{"tool": 0.4, "reasoning": 0.3, "interaction": 0.2, "stability": 0.1}'),
('level_thresholds', '{"Master": 850, "Expert": 700, "Proficient": 500, "Novice": 0}');
