export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { scheduleAgent } from '@/lib/scheduler';
import { log } from '@/lib/logger';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const agents = await prisma.scheduledAgent.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ agents });
  } catch (err) {
    log('error', 'Failed to fetch scheduled agents', { err: String(err) });
    return NextResponse.json({ error: 'Failed to fetch scheduled agents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { name, task, cronExpression, enabled, llmConfigJson } = body as {
      name: string; task: string; cronExpression: string; enabled: boolean; llmConfigJson?: string;
    };

    const agent = await prisma.scheduledAgent.create({
      data: { name, task, cronExpression, enabled, llmConfigJson },
    });

    if (enabled) scheduleAgent(agent.id, agent.cronExpression, agent.llmConfigJson);

    return NextResponse.json({ agent });
  } catch (err) {
    log('error', 'Failed to create scheduled agent', { err: String(err) });
    return NextResponse.json({ error: 'Failed to create scheduled agent' }, { status: 500 });
  }
}
