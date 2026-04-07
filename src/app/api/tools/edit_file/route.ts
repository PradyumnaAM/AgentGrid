import { NextRequest, NextResponse } from 'next/server';
import { editFile } from '@/lib/workspace';

export async function POST(req: NextRequest) {
  try {
    const { path: filePath, oldString, newString } = await req.json();

    if (!filePath || !oldString || newString === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await editFile(filePath, oldString, newString);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to edit file' },
      { status: 500 }
    );
  }
}
