import { NextRequest, NextResponse } from 'next/server';

function checkWorkflowPermission(role: string, action: string) {
  if (role === 'viewer') {
    return { allowed: false, reason: `Role 'viewer' is not allowed to ${action} workflows. Required: owner or editor.` };
  }
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflowId, input = {} } = body;
    const role = req.headers.get('x-hasura-role') || 'owner';
    const userId = req.headers.get('x-hasura-user-id') || 'user-owner-a';

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId parameter is required' }, { status: 400 });
    }

    const permCheck = checkWorkflowPermission(role, 'run');
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 });
    }

    const runId = 'run_' + Math.random().toString(36).slice(2, 9);

    return NextResponse.json({
      success: true,
      workflowRunId: runId,
      status: 'running',
      triggeredBy: userId,
      input,
      message: 'Workflow execution initiated successfully via Hasura Action',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
