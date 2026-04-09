export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const row = await prisma.session.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (row.userId !== user!.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.session.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log('error', 'Failed to delete session', { err: String(err) });
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
