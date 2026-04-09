export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { LlmConfig } from '@/store/useAgentStore';

const MAX_ITERATIONS = 10;

const TOOL_ENDPOINTS: Record<string, string> = {
  create_file: '/api/tools/create_file',
  read_dir: '/api/tools/read_dir',
  read_file: '/api/tools/read_file',
  search: '/api/tools/search',
  edit_file: '/api/tools/edit_file',
};

function extractToolCall(text: string): { tool: string; params: Record<string, unknown> } | null {
  const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.tool && parsed.params) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const sa = await prisma.scheduledAgent.findUnique({ where: { id } });
    if (!sa || !sa.enabled || !sa.llmConfigJson) {
      return NextResponse.json({ error: 'Agent not found or not configured' }, { status: 404 });
    }

    const llmConfig = JSON.parse(sa.llmConfigJson) as LlmConfig;
    const logs: string[] = [];
    let currentPrompt = `You are an autonomous AI agent. Complete this task: ${sa.task}\n\nYou can use tools by responding with a JSON code block:\n\`\`\`json\n{"tool": "tool_name", "params": {...}}\n\`\`\`\n\nAvailable tools: create_file, read_dir, read_file, search, edit_file.\nWhen done, respond with plain text only (no tool call).`;

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const streamRes = await fetch(`${baseUrl}/api/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: 'You are a helpful AI agent.', prompt: currentPrompt, llmConfig }),
      });

      if (!streamRes.ok || !streamRes.body) break;

      let fullContent = '';
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.fullContent) fullContent = data.fullContent;
            } catch {}
          }
        }
      }

      logs.push(`[Iteration ${i + 1}] ${fullContent.slice(0, 200)}`);

      const toolCall = extractToolCall(fullContent);
      if (!toolCall) break; // Task complete

      const endpoint = TOOL_ENDPOINTS[toolCall.tool];
      if (!endpoint) break;

      const toolRes = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolCall.params),
      });

      const toolData = await toolRes.json();
      currentPrompt = `Previous result: ${toolData.result ?? toolData.error}\n\nContinue with the task: ${sa.task}`;
    }

    // Save results as a session
    const sessionId = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await prisma.session.create({
      data: {
        id: sessionId,
        name: `Scheduled: ${sa.name}`,
        userId: 'system',
        agentsJson: JSON.stringify([]),
        messagesJson: JSON.stringify([]),
        startTime: BigInt(Date.now()),
        endTime: BigInt(Date.now()),
        status: 'completed',
        estimatedTokens: 0,
        estimatedCost: 0,
      },
    });

    return NextResponse.json({ ok: true, sessionId, logs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
