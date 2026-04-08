import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { fromAgentId, fromAgentName, toAgentId, toAgentName, content, toAgent, recipient, message } = await req.json();

    const targetName = toAgent || toAgentName || recipient;
    const msgContent = content || message;

    if (!targetName || !msgContent) {
      return NextResponse.json({ error: 'Missing required fields: toAgent and content' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result: `Message queued for ${targetName}` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}
