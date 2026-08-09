-- Seed Data for AI Agent Workflow Builder
-- Creates Org A (Acme Corp) and Org B (Globex Inc) with pre-configured users and workflows

-- 1. Organizations
INSERT INTO organizations (id, name, quota_allowed, quota_used, quota_period)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Acme Corp', 100, 37, 'monthly'),
  ('22222222-2222-2222-2222-222222222222', 'Globex Inc', 50, 12, 'monthly')
ON CONFLICT (id) DO NOTHING;

-- 2. Workflows for Org A
INSERT INTO workflows (id, org_id, name, description)
VALUES 
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Customer Review Workflow', 'Analyze incoming customer reviews with Gemini, post high-priority alerts to HTTP webhook, and conditionally trigger manual approval for negative feedback.')
ON CONFLICT (id) DO NOTHING;

-- 3. Workflow Steps for Org A Workflow
INSERT INTO workflow_steps (id, workflow_id, position, type, name, config)
VALUES
  ('s1', '33333333-3333-3333-3333-333333333333', 0, 'llm_call', 'Sentiment Analysis', '{"prompt": "Analyze the customer review for sentiment and main themes:", "model": "gemini-2.0-flash"}'),
  ('s2', '33333333-3333-3333-3333-333333333333', 1, 'http_request', 'Log to Analytics API', '{"url": "https://httpbin.org/post", "method": "POST"}'),
  ('s3', '33333333-3333-3333-3333-333333333333', 2, 'conditional_branch', 'Check Negative Sentiment', '{"field": "sentiment", "operator": "==", "value": "negative"}'),
  ('s4', '33333333-3333-3333-3333-333333333333', 3, 'approval_gate', 'Manager Escalation Gate', '{"required_role": "editor", "message": "Negative sentiment detected. Approve refund/contact escalation."}'),
  ('s5', '33333333-3333-3333-3333-333333333333', 4, 'db_write', 'Save Escalation Record', '{"table": "escalations"}')
ON CONFLICT (id) DO NOTHING;
