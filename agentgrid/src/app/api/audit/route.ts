export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { logAudit } from '@/lib/auditLogger';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { agentId, agentName, tool, action, params, result } = body as {
      agentId: string;
      agentName: string;
      tool: string;
      action: 'approved' | 'denied' | 'error';
      params: Record<string, unknown>;
      result?: string;
    };

    await logAudit({ agentId, agentName, tool, action, params, result, userId: user!.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log('error', 'Failed to log audit entry', { err: String(err) });
    return NextResponse.json({ error: 'Failed to log audit entry' }, { status: 500 });
  }
}
