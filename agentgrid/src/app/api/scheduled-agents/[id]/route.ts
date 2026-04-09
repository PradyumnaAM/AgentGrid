export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { scheduleAgent, stopAgent } from '@/lib/scheduler';
import { log } from '@/lib/logger';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const agent = await prisma.scheduledAgent.update({
      where: { id },
      data: body,
    });

    if (agent.enabled) {
      scheduleAgent(agent.id, agent.cronExpression, agent.llmConfigJson);
    } else {
      stopAgent(agent.id);
    }

    return NextResponse.json({ agent });
  } catch (err) {
    log('error', 'Failed to update scheduled agent', { err: String(err) });
    return NextResponse.json({ error: 'Failed to update scheduled agent' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    await prisma.scheduledAgent.delete({ where: { id } });
    stopAgent(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log('error', 'Failed to delete scheduled agent', { err: String(err) });
    return NextResponse.json({ error: 'Failed to delete scheduled agent' }, { status: 500 });
  }
}
