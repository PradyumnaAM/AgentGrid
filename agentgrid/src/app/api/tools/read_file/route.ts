import { NextRequest, NextResponse } from 'next/server';
import { readFile } from '@/lib/workspace';

export async function POST(req: NextRequest) {
  try {
    const { path: filePath } = await req.json();

    if (!filePath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const result = await readFile(filePath);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to read file' },
      { status: 500 }
    );
  }
}
