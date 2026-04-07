import { NextRequest } from 'next/server';

// Parse OpenAI rate-limit duration strings like "6m0s", "30s", "1h2m3s" → future ms timestamp
function parseDurationToResetAt(s: string | null): number | null {
  if (!s) return null;
  let ms = 0;
  const hours = s.match(/(\d+)h/);
  const minutes = s.match(/(\d+)m(?!s)/);
  const seconds = s.match(/(\d+)s/);
  const millis = s.match(/(\d+)ms/);
  if (hours) ms += parseInt(hours[1]) * 3_600_000;
  if (minutes) ms += parseInt(minutes[1]) * 60_000;
  if (seconds) ms += parseInt(seconds[1]) * 1_000;
  if (millis) ms += parseInt(millis[1]);
  return ms > 0 ? Date.now() + ms : null;
}

export async function POST(req: NextRequest) {
  const { systemPrompt, prompt, llmConfig } = await req.json();
  const apiKey = llmConfig?.apiKey as string | undefined;
  const provider = (llmConfig?.provider as string | undefined) ?? 'openai';
  const model = (llmConfig?.model as string | undefined) ?? 'gpt-4o-mini';
  const baseUrl = (llmConfig?.baseUrl as string | undefined)?.trim();

  if (!apiKey) {
    return new Response('Missing API key', { status: 400 });
  }

  const endpoint =
    provider === 'openai_compatible'
      ? `${baseUrl?.replace(/\/$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

  if (provider === 'openai_compatible' && !baseUrl) {
    return new Response('Missing base URL for OpenAI-compatible provider', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            stream: true,
            temperature: 0.3,
            max_tokens: 2048,
          }),
        });

        // Always emit rate limit headers when available (even on error responses)
        const rlTokensLimit = parseInt(res.headers.get('x-ratelimit-limit-tokens') ?? '0');
        const rlTokensRemaining = parseInt(res.headers.get('x-ratelimit-remaining-tokens') ?? '0');
        const rlRequestsLimit = parseInt(res.headers.get('x-ratelimit-limit-requests') ?? '0');
        const rlRequestsRemaining = parseInt(res.headers.get('x-ratelimit-remaining-requests') ?? '0');
        const rlTokensResetAt = parseDurationToResetAt(res.headers.get('x-ratelimit-reset-tokens'));
        const rlRequestsResetAt = parseDurationToResetAt(res.headers.get('x-ratelimit-reset-requests'));

        if (rlTokensLimit > 0 || rlRequestsLimit > 0) {
          controller.enqueue(encoder.encode(
            `event: ratelimit\ndata: ${JSON.stringify({
              tokensLimit: rlTokensLimit,
              tokensRemaining: rlTokensRemaining,
              requestsLimit: rlRequestsLimit,
              requestsRemaining: rlRequestsRemaining,
              tokensResetAt: rlTokensResetAt,
              requestsResetAt: rlRequestsResetAt,
            })}\n\n`
          ));
        }

        if (!res.ok) {
          const error = await res.text();
          // On 429, emit ratelimit with 0 remaining so the UI can show the countdown
          if (res.status === 429) {
            const resetAt = parseDurationToResetAt(res.headers.get('retry-after') ? `${res.headers.get('retry-after')}s` : res.headers.get('x-ratelimit-reset-tokens'));
            controller.enqueue(encoder.encode(
              `event: ratelimit\ndata: ${JSON.stringify({
                tokensLimit: rlTokensLimit,
                tokensRemaining: 0,
                requestsLimit: rlRequestsLimit,
                requestsRemaining: 0,
                tokensResetAt: resetAt,
                requestsResetAt: resetAt,
              })}\n\n`
            ));
          }
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error })}\n\n`)
          );
          controller.close();
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((l) => l.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                controller.enqueue(
                  encoder.encode(`event: done\ndata: {"done":true}\n\n`)
                );
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;

                if (content) {
                  fullContent += content;
                  controller.enqueue(
                    encoder.encode(
                      `event: chunk\ndata: ${JSON.stringify({ content })}\n\n`
                    )
                  );
                }
              } catch {}
            }
          }
        }

        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify({ fullContent })}\n\n`
          )
        );
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
