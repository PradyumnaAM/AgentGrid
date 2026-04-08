import { NextRequest, NextResponse } from 'next/server';
import { createFile } from '@/lib/workspace';

export async function POST(req: NextRequest) {
  try {
    const { path: filePath, content } = await req.json();

    if (!filePath || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing path or content' }, { status: 400 });
    }

    const result = await createFile(filePath, content);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create file' },
      { status: 500 }
    );
  }
}
