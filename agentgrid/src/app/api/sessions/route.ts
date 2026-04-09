export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const rows = await prisma.session.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const sessions = rows.map((r) => ({
      id: r.id,
      name: r.name,
      agents: JSON.parse(r.agentsJson),
      messages: JSON.parse(r.messagesJson),
      startTime: Number(r.startTime),
      endTime: r.endTime != null ? Number(r.endTime) : null,
      status: r.status,
      estimatedTokens: r.estimatedTokens,
      estimatedCost: r.estimatedCost,
    }));

    return NextResponse.json({ sessions });
  } catch (err) {
    log('error', 'Failed to fetch sessions', { err: String(err) });
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { id, name, agents, messages, startTime, endTime, status, estimatedTokens, estimatedCost } = body;

    await prisma.session.upsert({
      where: { id },
      create: {
        id,
        name,
        userId: user!.id,
        agentsJson: JSON.stringify(agents ?? []),
        messagesJson: JSON.stringify(messages ?? []),
        startTime: BigInt(startTime ?? Date.now()),
        endTime: endTime != null ? BigInt(endTime) : null,
        status: status ?? 'active',
        estimatedTokens: estimatedTokens ?? 0,
        estimatedCost: estimatedCost ?? 0,
      },
      update: {
        name,
        agentsJson: JSON.stringify(agents ?? []),
        messagesJson: JSON.stringify(messages ?? []),
        endTime: endTime != null ? BigInt(endTime) : null,
        status: status ?? 'active',
        estimatedTokens: estimatedTokens ?? 0,
        estimatedCost: estimatedCost ?? 0,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    log('error', 'Failed to save session', { err: String(err) });
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}
