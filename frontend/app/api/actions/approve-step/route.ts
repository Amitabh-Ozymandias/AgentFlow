import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runId, stepRunId } = body;
    const role = req.headers.get('x-hasura-role') || 'owner';
    const userId = req.headers.get('x-hasura-user-id') || 'user-owner-a';

    if (!runId || !stepRunId) {
      return NextResponse.json({ error: 'runId and stepRunId parameters are required' }, { status: 400 });
    }

    if (role === 'viewer') {
      return NextResponse.json({ error: "Access denied: viewers cannot approve steps (requires 'owner' or 'editor')" }, { status: 403 });
    }

    const now = new Date().toISOString();

    return NextResponse.json({
      success: true,
      runId,
      stepRunId,
      status: 'completed',
      approvedBy: userId,
      approvedAt: now,
      message: 'Step approved and workflow execution resumed',
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
