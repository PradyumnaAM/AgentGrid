export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

/**
 * Server-only endpoint — returns the raw API key string for a given key ID.
 * Only called server-side from /api/stream. Never expose to the browser directly.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key || key.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    apiKey: key.apiKey,
    provider: key.provider,
    model: key.model,
    baseUrl: key.baseUrl,
  });
}
