import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { llmConfig } = await req.json();
    const apiKey = llmConfig?.apiKey as string | undefined;
    const provider = (llmConfig?.provider as string | undefined) ?? 'openai';
    const baseUrl = (llmConfig?.baseUrl as string | undefined)?.trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key provided' }, { status: 400 });
    }

    const endpoint =
      provider === 'openai_compatible'
        ? `${baseUrl?.replace(/\/$/, '')}/models`
        : 'https://api.openai.com/v1/models';

    if (provider === 'openai_compatible' && !baseUrl) {
      return NextResponse.json({ error: 'Base URL is required for OpenAI-compatible providers' }, { status: 400 });
    }

    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const raw = await res.text();
      let detail = 'Invalid API key';
      try {
        const parsed = JSON.parse(raw) as { error?: { message?: string } };
        detail = parsed?.error?.message || detail;
      } catch {
        if (raw) detail = raw;
      }
      return NextResponse.json({ error: detail }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
