const KEY = 'agentgrid_checkpoints';

export interface AgentCheckpoint {
  agentId: string;
  task: string;
  iteration: number;
  savedAt: number;
}

function readAll(): Record<string, AgentCheckpoint> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveCheckpoint(cp: AgentCheckpoint): void {
  try {
    const all = readAll();
    all[cp.agentId] = cp;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function clearCheckpoint(agentId: string): void {
  try {
    const all = readAll();
    delete all[agentId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function loadAllCheckpoints(): Record<string, AgentCheckpoint> {
  return readAll();
}
