export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const agent = await prisma.scheduledAgent.findUnique({ where: { id } });
    if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    fetch(`${baseUrl}/api/scheduled-agents/${id}/run`, { method: 'POST' }).catch(() => {});

    return NextResponse.json({ ok: true, message: 'Agent triggered' });
  } catch (err) {
    log('error', 'Failed to trigger agent', { err: String(err) });
    return NextResponse.json({ error: 'Failed to trigger agent' }, { status: 500 });
  }
}
