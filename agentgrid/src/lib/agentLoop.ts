import { streamLLM, buildTaskPrompt, buildContinuationPrompt } from '@/lib/llm';
import { useAgentStore } from '@/store/useAgentStore';
import { useSessionStore } from '@/store/useSessionStore';
import { estimateTokens } from '@/lib/costTracker';
import { saveCheckpoint, clearCheckpoint } from '@/lib/agentCheckpoint';
import { withRetry } from '@/lib/retry';
import type { ToolAction } from '@/lib/types';

const TOOL_ENDPOINTS: Record<string, string> = {
  create_file: '/api/tools/create_file',
  read_dir: '/api/tools/read_dir',
  read_file: '/api/tools/read_file',
  search: '/api/tools/search',
  edit_file: '/api/tools/edit_file',
  send_message: '/api/tools/send_message',
};

interface AgentLoopOptions {
  agentId: string;
  task: string;
}

export async function runAgentLoop({ agentId, task }: AgentLoopOptions): Promise<void> {
  const store = useAgentStore.getState();
  const sessionStore = useSessionStore.getState();
  const agent = store.agents.find((a) => a.id === agentId);
  if (!agent) return;

  let sessionId = sessionStore.currentSessionId;
  if (!sessionId) {
    sessionId = sessionStore.createSession(`Session - ${new Date().toLocaleTimeString()}`, store.agents);
  }

  let currentPrompt = buildTaskPrompt(task);
  let iteration = 0;
  const maxIterations = 20;

  store.updateAgentStatus(agentId, 'thinking');
  store.pushLog(agentId, `Starting task: ${task}`, 'system');

  while (iteration < maxIterations) {
    iteration++;
    saveCheckpoint({ agentId, task, iteration, savedAt: Date.now() });
    let hasError = false;
    let streamedContent = '';
    const actionRef: { current: { tool: string; params: Record<string, unknown> } | null } = { current: null };

    const llmConfig = useAgentStore.getState().getLlmConfigForAgent(agentId);
    await streamLLM(currentPrompt, llmConfig, {
      onChunk: (chunk) => {
        streamedContent += chunk;
      },
      onThought: (thought) => {
        store.pushLog(agentId, thought, 'thought');
      },
      onAction: (action) => {
        actionRef.current = action;
      },
      onRateLimit: (info) => {
        useAgentStore.getState().updateAgentRateLimit(agentId, info);
      },
      onDone: () => {
        if (streamedContent) {
          const tokens = estimateTokens(streamedContent);
          sessionStore.addTokens(tokens);
        }
      },
      onError: (error) => {
        hasError = true;
        store.pushLog(agentId, `Error: ${error}`, 'error');
        store.updateAgentStatus(agentId, 'error');
        clearCheckpoint(agentId);
        fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, agentName: agent.name, tool: 'llm_stream', action: 'error', params: {}, result: String(error) }),
        }).catch(() => {});
      },
    });

    if (hasError) return;

    if (!actionRef.current) {
      store.pushLog(agentId, 'Task complete', 'system');
      store.updateAgentStatus(agentId, 'idle');
      clearCheckpoint(agentId);
      return;
    }

    const toolName = actionRef.current.tool;
    const toolParams = actionRef.current.params;

    store.pushLog(agentId, `Action: ${toolName}(${JSON.stringify(toolParams)})`, 'action');

    const action: ToolAction = {
      id: `action-${Date.now()}-${iteration}`,
      agentId,
      tool: toolName as ToolAction['tool'],
      params: toolParams,
      status: 'pending',
      timestamp: Date.now(),
    };

    store.submitAction(action);

    const wasDenied = await new Promise<boolean>((resolve) => {
      const checkApproval = setInterval(() => {
        const current = useAgentStore.getState().activeAction;

        if (current && current.id === action.id && current.status === 'approved') {
          clearInterval(checkApproval);
          resolve(false);
          return;
        }

        if (current && current.id === action.id && current.status === 'denied') {
          clearInterval(checkApproval);
          resolve(true);
          return;
        }

        if (useAgentStore.getState().drawerOpen === false && (!current || current.id !== action.id)) {
          const agent = useAgentStore.getState().agents.find((a) => a.id === agentId);
          if (agent?.status === 'idle') {
            clearInterval(checkApproval);
            resolve(false);
          }
        }
      }, 200);
    });

    if (wasDenied) {
      store.pushLog(agentId, 'Tool request denied by user', 'error');
      currentPrompt = buildContinuationPrompt(task, 'Tool request was denied by user.', true);
      continue;
    }

    const endpoint = TOOL_ENDPOINTS[toolName];
    if (!endpoint) {
      store.pushLog(agentId, `Unknown tool: ${toolName}`, 'error');
      store.updateAgentStatus(agentId, 'error');
      clearCheckpoint(agentId);
      return;
    }

    if (toolName === 'send_message') {
      const targetName = (toolParams.toAgent || toolParams.toAgentName || toolParams.recipient) as string;
      const content = (toolParams.content || toolParams.message) as string;

      if (!targetName || !content) {
        store.pushLog(agentId, 'send_message requires toAgent and content', 'error');
        currentPrompt = buildContinuationPrompt(task, 'Error: send_message requires "toAgent" (agent name) and "content" fields.', false);
        store.completeAction(action.id, 'Missing required fields');
        continue;
      }

      const targetAgent = store.agents.find((a) => a.name.toLowerCase() === targetName.toLowerCase() || a.id.toLowerCase() === targetName.toLowerCase());

      if (!targetAgent) {
        const available = store.agents.map((a) => a.name).join(', ');
        store.pushLog(agentId, `Agent "${targetName}" not found. Available: ${available}`, 'error');
        currentPrompt = buildContinuationPrompt(task, `Error: Agent "${targetName}" not found. Available agents: ${available}`, false);
        store.completeAction(action.id, `Agent not found: ${targetName}`);
        continue;
      }

      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        fromAgentId: agentId,
        fromAgentName: agent.name,
        toAgentId: targetAgent.id,
        toAgentName: targetAgent.name,
        type: 'delegation' as const,
        content,
        timestamp: Date.now(),
        status: 'pending' as const,
      };

      useAgentStore.getState().sendMessage(message);
      sessionStore.addMessage(message);
      store.pushLog(agentId, `→ Message to ${targetAgent.name}: "${content}"`, 'message');
      store.pushLog(targetAgent.id, `← Message from ${agent.name}: "${content}"`, 'message');
      store.completeAction(action.id, `Message delivered to ${targetAgent.name}`);
      currentPrompt = buildContinuationPrompt(task, `Message successfully delivered to ${targetAgent.name}.`, false);
      continue;
    }

    let retryAttempt = 0;
    try {
      const data = await withRetry(
        async () => {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toolParams),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
          return json;
        },
        { maxAttempts: 3, baseDelayMs: 1000, multiplier: 2 },
        (attempt, err) => {
          retryAttempt = attempt;
          useAgentStore.getState().updateActionRetryCount(action.id, attempt);
          store.pushLog(agentId, `Retry ${attempt}/3 for ${toolName}: ${err instanceof Error ? err.message : err}`, 'system');
        }
      );

      store.pushLog(agentId, `Result: ${data.result}`, 'result');
      currentPrompt = buildContinuationPrompt(task, data.result, false);
      store.completeAction(action.id, data.result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tool execution failed';
      store.pushLog(agentId, `Failed after ${retryAttempt + 1} attempt(s): ${msg}`, 'error');
      currentPrompt = buildContinuationPrompt(task, msg, false);
      store.completeAction(action.id, `Error: ${msg}`);
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, agentName: agent.name, tool: toolName, action: 'error', params: toolParams, result: msg }),
      }).catch(() => {});
    }
  }

  store.pushLog(agentId, 'Max iterations reached', 'system');
  store.updateAgentStatus(agentId, 'idle');
  clearCheckpoint(agentId);
}
