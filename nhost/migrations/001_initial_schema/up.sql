-- AI Agent Workflow Builder — Initial Schema
-- This migration creates all 7 core tables with proper
-- foreign keys, indexes, enums, and constraints.

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE org_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TYPE step_type AS ENUM (
  'llm_call',
  'http_request',
  'db_write',
  'notify',
  'conditional_branch',
  'approval_gate'
);

CREATE TYPE trigger_type AS ENUM (
  'manual',
  'webhook',
  'scheduled',
  'database_event'
);

CREATE TYPE run_status AS ENUM (
  'pending',
  'running',
  'paused',
  'completed',
  'failed'
);

CREATE TYPE step_run_status AS ENUM (
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'skipped'
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  quota_allowed INTEGER NOT NULL DEFAULT 100,
  quota_used    INTEGER NOT NULL DEFAULT 0,
  quota_period  TEXT NOT NULL DEFAULT 'monthly',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT quota_non_negative CHECK (quota_used >= 0),
  CONSTRAINT quota_allowed_positive CHECK (quota_allowed > 0)
);

-- ============================================================
-- ORG MEMBERS
-- Joins auth.users → organizations with a role
-- ============================================================

CREATE TABLE org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        org_role NOT NULL DEFAULT 'viewer',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A user can only belong to an org once
  CONSTRAINT unique_org_user UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_org_members_user_org ON org_members(user_id, org_id);

-- ============================================================
-- WORKFLOWS
-- Scoped to an organization
-- ============================================================

CREATE TABLE workflows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflows_org_id ON workflows(org_id);

-- ============================================================
-- WORKFLOW STEPS
-- Ordered steps within a workflow
-- ============================================================

CREATE TABLE workflow_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  type        step_type NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Position must be unique within a workflow
  CONSTRAINT unique_step_position UNIQUE (workflow_id, position)
);

CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id, position);

-- ============================================================
-- WORKFLOW TRIGGERS
-- How a workflow can be started
-- ============================================================

CREATE TABLE workflow_triggers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  type        trigger_type NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One trigger type per workflow
  CONSTRAINT unique_trigger_type UNIQUE (workflow_id, type)
);

CREATE INDEX idx_workflow_triggers_workflow ON workflow_triggers(workflow_id);

-- For webhook lookup by token
CREATE INDEX idx_workflow_triggers_config ON workflow_triggers USING GIN (config);

-- ============================================================
-- WORKFLOW RUNS
-- An execution instance of a workflow
-- ============================================================

CREATE TABLE workflow_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  triggered_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_type  trigger_type NOT NULL DEFAULT 'manual',
  status        run_status NOT NULL DEFAULT 'pending',
  input         JSONB DEFAULT '{}',
  output        JSONB DEFAULT '{}',
  error         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);

-- ============================================================
-- STEP RUNS
-- Per-step execution within a workflow run
-- This table drives the live execution UI via subscriptions
-- ============================================================

CREATE TABLE step_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id   UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  workflow_step_id  UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  
  position          INTEGER NOT NULL,
  step_type         step_type NOT NULL,
  step_name         TEXT NOT NULL DEFAULT '',
  
  status            step_run_status NOT NULL DEFAULT 'pending',
  input             JSONB DEFAULT '{}',
  output            JSONB DEFAULT '{}',
  error             TEXT,
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  
  approved_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_step_runs_workflow_run ON step_runs(workflow_run_id);
CREATE INDEX idx_step_runs_status ON step_runs(status);
CREATE INDEX idx_step_runs_run_position ON step_runs(workflow_run_id, position);

-- ============================================================
-- HELPER: update updated_at on modification
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_workflows_updated
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AGGREGATION VIEW: Org Run Analytics
-- Computes org-level usage this month & average run duration
-- ============================================================

CREATE OR REPLACE VIEW org_run_analytics AS
SELECT 
  o.id AS org_id,
  o.name AS org_name,
  o.quota_allowed,
  o.quota_used,
  COUNT(r.id) AS total_runs,
  COUNT(CASE WHEN r.status = 'completed' THEN 1 END) AS completed_runs,
  COUNT(CASE WHEN r.status = 'failed' THEN 1 END) AS failed_runs,
  COALESCE(AVG(EXTRACT(EPOCH FROM (r.completed_at - r.started_at))), 0) AS avg_duration_seconds
FROM organizations o
LEFT JOIN workflows w ON w.org_id = o.id
LEFT JOIN workflow_runs r ON r.workflow_id = w.id
GROUP BY o.id, o.name, o.quota_allowed, o.quota_used;

