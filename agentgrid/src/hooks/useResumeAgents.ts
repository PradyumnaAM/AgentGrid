'use client';

import { useEffect } from 'react';
import { useAgentStore } from '@/store/useAgentStore';
import { loadAllCheckpoints, clearCheckpoint } from '@/lib/agentCheckpoint';
import { runAgentLoop } from '@/lib/agentLoop';

export function useResumeAgents(): void {
  useEffect(() => {
    const checkpoints = loadAllCheckpoints();
    const store = useAgentStore.getState();

    for (const [agentId, cp] of Object.entries(checkpoints)) {
      const agent = store.agents.find((a) => a.id === agentId);

      if (!agent) {
        clearCheckpoint(agentId);
        continue;
      }

      if (agent.status === 'thinking' || agent.status === 'waiting_approval' || agent.status === 'executing') {
        store.pushLog(agentId, `[Resumed after refresh — restarting from iteration ${cp.iteration}]`, 'system');
        store.updateAgentStatus(agentId, 'idle');
        runAgentLoop({ agentId, task: cp.task }).catch(() => {});
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
