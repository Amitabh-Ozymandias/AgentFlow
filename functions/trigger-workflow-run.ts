// ============================================================
// Nhost Function — triggerWorkflowRun
// Action handler for initiating a workflow execution instance
// ============================================================

import { Request, Response } from 'express';
import { checkWorkflowPermission, checkQuota } from './lib/permissions';
import { executeStep } from './lib/step-executors';

export default async function triggerWorkflowRunHandler(req: Request, res: Response) {
  try {
    const { workflowId, input = {} } = req.body;
    const userId = req.headers['x-hasura-user-id'] as string || 'user-owner-a';
    const orgId = req.headers['x-hasura-org-id'] as string || 'org-a';
    const role = (req.headers['x-hasura-role'] as 'owner' | 'editor' | 'viewer') || 'owner';

    // 1. Layer 2 Permission Check
    const permCheck = checkWorkflowPermission({ userId, orgId, role }, 'run');
    if (!permCheck.allowed) {
      return res.status(403).json({ error: permCheck.reason });
    }

    // 2. Quota Check (Mock 100 max)
    const quotaCheck = checkQuota(37, 100);
    if (!quotaCheck.allowed) {
      return res.status(429).json({ error: quotaCheck.reason });
    }

    return res.status(200).json({
      success: true,
      workflowRunId: 'run_' + Math.random().toString(36).slice(2, 9),
      status: 'running',
      message: 'Workflow execution initiated successfully',
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
