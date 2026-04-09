export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.apiKey.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log('error', 'Failed to delete API key', { err: String(err) });
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { name, model, baseUrl } = await req.json() as {
      name?: string; model?: string; baseUrl?: string;
    };

    const key = await prisma.apiKey.update({
      where: { id },
      data: { ...(name && { name }), ...(model && { model }), baseUrl },
      select: { id: true, name: true, provider: true, model: true, baseUrl: true, createdAt: true },
    });

    return NextResponse.json({ key });
  } catch (err) {
    log('error', 'Failed to update API key', { err: String(err) });
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}
