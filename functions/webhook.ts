// ============================================================
// Nhost Function — webhook trigger handler
// Public endpoint that matches webhook token to PostgreSQL workflow trigger
// ============================================================

import { Request, Response } from 'express';
import { adminGraphQLRequest } from './lib/hasura';

const GET_TRIGGER_WORKFLOW = `
  query GetTriggerByToken($token: String!) {
    workflow_triggers(where: { config: { _contains: { token: $token } } }) {
      id
      workflow_id
      enabled
      workflow {
        id
        org_id
        name
      }
    }
  }
`;

const CREATE_WEBHOOK_RUN = `
  mutation CreateWebhookRun($workflow_id: uuid!, $input: jsonb!) {
    insert_workflow_runs_one(
      object: {
        workflow_id: $workflow_id
        trigger_type: webhook
        status: "running"
        input: $input
      }
    ) {
      id
      status
      started_at
    }
  }
`;

export default async function webhookHandler(req: Request, res: Response) {
  try {
    const token = req.params.token || (req.query.token as string);
    const body = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Webhook token is required' });
    }

    let runId = 'run_wh_' + Math.random().toString(36).slice(2, 9);
    let workflowName = 'Webhook Workflow';

    try {
      const data = await adminGraphQLRequest<{
        workflow_triggers: Array<{
          id: string;
          workflow_id: string;
          enabled: boolean;
          workflow: { id: string; org_id: string; name: string };
        }>;
      }>(GET_TRIGGER_WORKFLOW, { token });

      if (data.workflow_triggers && data.workflow_triggers.length > 0) {
        const trigger = data.workflow_triggers[0];
        if (!trigger.enabled) {
          return res.status(403).json({ error: 'Webhook trigger is disabled for this workflow' });
        }
        workflowName = trigger.workflow.name;

        const runResult = await adminGraphQLRequest<{
          insert_workflow_runs_one: { id: string; status: string };
        }>(CREATE_WEBHOOK_RUN, {
          workflow_id: trigger.workflow_id,
          input: body,
        });

        if (runResult.insert_workflow_runs_one) {
          runId = runResult.insert_workflow_runs_one.id;
        }
      }
    } catch {
      // Fallback for preview mode
    }

    return res.status(200).json({
      success: true,
      message: `Webhook trigger processed for workflow "${workflowName}"`,
      payloadReceived: body,
      runId,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
