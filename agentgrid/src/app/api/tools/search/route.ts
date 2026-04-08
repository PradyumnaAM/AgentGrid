import { NextRequest, NextResponse } from 'next/server';
import { searchFiles } from '@/lib/workspace';

export async function POST(req: NextRequest) {
  try {
    const { query, path: dirPath, searchContent } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    const result = await searchFiles(query, dirPath, searchContent === true);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      { status: 500 }
    );
  }
}
