import { NextRequest, NextResponse } from 'next/server';
import { getTree } from '@/lib/workspace';

export async function POST(req: NextRequest) {
  try {
    const { path: dirPath } = await req.json();
    const tree = await getTree(dirPath || '.');
    return NextResponse.json({ success: true, tree });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to read workspace' },
      { status: 500 }
    );
  }
}
