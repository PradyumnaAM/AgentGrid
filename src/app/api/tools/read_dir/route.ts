import { NextRequest, NextResponse } from 'next/server';
import { readDir } from '@/lib/workspace';

export async function POST(req: NextRequest) {
  try {
    const { path: dirPath } = await req.json();
    const result = await readDir(dirPath || '.');
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to read directory' },
      { status: 500 }
    );
  }
}
