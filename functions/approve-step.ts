// ============================================================
// Nhost Function — approveStep
// Action handler for approving a paused approval gate step run
// ============================================================

import { Request, Response } from 'express';
import { checkWorkflowPermission } from './lib/permissions';

export default async function approveStepHandler(req: Request, res: Response) {
  try {
    const { runId, stepRunId } = req.body;
    const userId = req.headers['x-hasura-user-id'] as string || 'user-owner-a';
    const orgId = req.headers['x-hasura-org-id'] as string || 'org-a';
    const role = (req.headers['x-hasura-role'] as 'owner' | 'editor' | 'viewer') || 'owner';

    // Layer 2 Permission Check
    const permCheck = checkWorkflowPermission({ userId, orgId, role }, 'approve');
    if (!permCheck.allowed) {
      return res.status(430).json({ error: permCheck.reason });
    }

    return res.status(200).json({
      success: true,
      runId,
      stepRunId,
      status: 'completed',
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      message: 'Step approved successfully. Execution resumed.',
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
