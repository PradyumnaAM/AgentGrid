export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, provider: true, model: true, baseUrl: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ keys });
  } catch (err) {
    log('error', 'Failed to fetch API keys', { err: String(err) });
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { name, provider, apiKey, model, baseUrl } = await req.json() as {
      name: string; provider: string; apiKey: string; model: string; baseUrl?: string;
    };

    if (!name || !provider || !apiKey || !model) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const key = await prisma.apiKey.create({
      data: { name, provider, apiKey, model, baseUrl, userId: user.id },
      select: { id: true, name: true, provider: true, model: true, baseUrl: true, createdAt: true },
    });

    return NextResponse.json({ key }, { status: 201 });
  } catch (err) {
    log('error', 'Failed to create API key', { err: String(err) });
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
