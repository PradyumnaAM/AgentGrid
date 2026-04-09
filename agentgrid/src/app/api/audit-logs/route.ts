export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId') ?? undefined;
  const action = searchParams.get('action') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId: user!.id,
        ...(agentId ? { agentId } : {}),
        ...(action ? { action } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        timestamp: l.timestamp.getTime(),
        agentId: l.agentId,
        agentName: l.agentName,
        tool: l.tool,
        action: l.action,
        params: JSON.parse(l.paramsJson),
        result: l.result,
      })),
    });
  } catch (err) {
    log('error', 'Failed to fetch audit logs', { err: String(err) });
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
