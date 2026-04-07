import type { LlmConfig } from '@/store/useAgentStore';
import type { RateLimitInfo } from '@/lib/types';

const SYSTEM_PROMPT = `You are an AI agent operating in a controlled workspace. You can only use the following tools:

- create_file: Create or overwrite a file (params: path, content)
- read_dir: List directory contents (params: path)
- read_file: Read a file's contents (params: path)
- search: Search file contents (params: query, path)
- edit_file: Edit file contents (params: path, oldString, newString)

RULES:
1. Respond with EXACTLY one JSON object per response
2. Use "thought" to explain your reasoning
3. Use "action" only when you need to execute a tool
4. When the task is complete, set "action" to null
5. Never output anything outside the JSON structure
6. Do NOT wrap JSON in markdown code fences

JSON FORMAT:
{"thought": "your reasoning", "action": {"tool": "tool_name", "params": {...}} or null}`;

export interface StreamCallbacks {
  onChunk?: (content: string) => void;
  onThought?: (thought: string) => void;
  onAction?: (action: { tool: string; params: Record<string, unknown> }) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
  onRateLimit?: (info: RateLimitInfo) => void;
}

function extractJSON(text: string): { thought: string; action: { tool: string; params: Record<string, unknown> } | null } | null {
  const cleaned = text.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.thought !== undefined) {
      return parsed;
    }
  } catch {}

  return null;
}

export async function streamLLM(
  prompt: string,
  llmConfig: LlmConfig,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    const res = await fetch('/api/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: SYSTEM_PROMPT,
        prompt,
        llmConfig,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      callbacks.onError?.(error);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError?.('No response stream');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let currentEvent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          continue;
        }

        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (currentEvent === 'ratelimit') {
            try { callbacks.onRateLimit?.(JSON.parse(data)); } catch {}
            currentEvent = '';
            continue;
          }

          if (data === '[DONE]') {
            callbacks.onDone?.();
            return;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.content) {
              fullContent += parsed.content;
              callbacks.onChunk?.(parsed.content);
            }

            if (parsed.fullContent) {
              const jsonResult = extractJSON(parsed.fullContent);
              if (jsonResult) {
                if (jsonResult.thought) {
                  callbacks.onThought?.(jsonResult.thought);
                }
                if (jsonResult.action) {
                  callbacks.onAction?.(jsonResult.action);
                }
              }
              callbacks.onDone?.();
              return;
            }

            if (parsed.error) {
              callbacks.onError?.(parsed.error);
              return;
            }

            if (parsed.done) {
              callbacks.onDone?.();
              return;
            }
          } catch {
            callbacks.onChunk?.(data);
          }
        }
      }
    }

    const jsonResult = extractJSON(fullContent);
    if (jsonResult) {
      if (jsonResult.thought) {
        callbacks.onThought?.(jsonResult.thought);
      }
      if (jsonResult.action) {
        callbacks.onAction?.(jsonResult.action);
      }
    }

    callbacks.onDone?.();
  } catch (err) {
    callbacks.onError?.(err instanceof Error ? err.message : 'Unknown error');
  }
}

export function buildTaskPrompt(task: string, context?: string): string {
  let prompt = `TASK: ${task}\n\n`;

  if (context) {
    prompt += `CONTEXT:\n${context}\n\n`;
  }

  prompt += `Analyze the task and respond with your next action in JSON format.`;

  return prompt;
}

export function buildContinuationPrompt(
  task: string,
  result: string,
  denied: boolean = false
): string {
  if (denied) {
    return `The previous tool request was DENIED by the user.\n\nResult: ${result}\n\nReconsider your approach and respond with a new action or completion.`;
  }

  return `Tool execution completed.\n\nResult: ${result}\n\nContinue with the task: ${task}\n\nRespond with your next action in JSON format, or null if the task is complete.`;
}
