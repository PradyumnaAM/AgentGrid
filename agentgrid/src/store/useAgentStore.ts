import { create } from 'zustand';
import type { Agent, AgentStatus, ToolAction, LogEntry, LogType, AgentMessage, RateLimitInfo } from '@/lib/types';

const STORAGE_KEY = 'agentgrid_openai_key';

export type LlmProvider = 'openai' | 'openai_compatible';

export interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  /** If set, the raw key is resolved server-side from the DB by the stream route */
  apiKeyId?: string;
}

/** API key metadata returned from server — raw key is never stored client-side */
export interface ApiKeyEntry {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl?: string | null;
}

const DEFAULT_LLM_CONFIG: LlmConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
};

function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getStoredLlmConfig(): LlmConfig {
  try {
    const raw = localStorage.getItem('agentgrid_llm_config');
    if (!raw) {
      const legacyKey = getStoredApiKey();
      return { ...DEFAULT_LLM_CONFIG, apiKey: legacyKey ?? '' };
    }
    const parsed = JSON.parse(raw) as Partial<LlmConfig>;
    return {
      provider: parsed.provider === 'openai_compatible' ? 'openai_compatible' : 'openai',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' && parsed.model ? parsed.model : DEFAULT_LLM_CONFIG.model,
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
    };
  } catch {
    return { ...DEFAULT_LLM_CONFIG, apiKey: getStoredApiKey() ?? '' };
  }
}

interface AgentStore {
  agents: Agent[];
  messages: AgentMessage[];
  activeAction: ToolAction | null;
  drawerOpen: boolean;
  llmConfig: LlmConfig;
  apiKeys: ApiKeyEntry[];
  settingsOpen: boolean;

  addAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  pushLog: (agentId: string, content: string, type?: LogType) => void;
  updateAgentRateLimit: (agentId: string, info: RateLimitInfo) => void;

  submitAction: (action: ToolAction) => void;
  approveAction: (actionId: string) => void;
  denyAction: (actionId: string) => void;
  completeAction: (actionId: string, result: string) => void;

  sendMessage: (message: AgentMessage) => void;
  getMessagesForAgent: (agentId: string) => AgentMessage[];
  markMessageRead: (messageId: string) => void;

  setDrawerOpen: (open: boolean) => void;
  setLlmConfig: (config: LlmConfig) => void;
  clearApiKey: () => void;
  setSettingsOpen: (open: boolean) => void;

  loadApiKeys: () => Promise<void>;
  addApiKey: (data: { name: string; provider: string; apiKey: string; model: string; baseUrl?: string }) => Promise<void>;
  removeApiKey: (id: string) => Promise<void>;
  getLlmConfigForAgent: (agentId: string) => LlmConfig;
  updateActionRetryCount: (actionId: string, count: number) => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  messages: [],
  activeAction: null,
  drawerOpen: false,
  llmConfig: getStoredLlmConfig(),
  apiKeys: [],
  settingsOpen: false,

  addAgent: (agent) =>
    set((state) => ({ agents: [...state.agents, agent] })),

  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
    })),

  updateAgentStatus: (id, status) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, status } : a
      ),
    })),

  pushLog: (agentId, content, type = 'system') =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId
          ? { ...a, log: [...a.log, { type, content, timestamp: Date.now() } as LogEntry] }
          : a
      ),
    })),

  updateAgentRateLimit: (agentId, info) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, rateLimit: info } : a
      ),
    })),

  submitAction: (action) =>
    set((state) => ({
      activeAction: action,
      drawerOpen: true,
      agents: state.agents.map((a) =>
        a.id === action.agentId
          ? { ...a, status: 'waiting_approval', pendingAction: action }
          : a
      ),
    })),

  approveAction: (actionId) =>
    set((state) => {
      const action = state.activeAction;
      if (!action || action.id !== actionId) return state;
      const agent = state.agents.find((a) => a.id === action.agentId);
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: action.agentId, agentName: agent?.name ?? action.agentId, tool: action.tool, action: 'approved', params: action.params }),
      }).catch(() => {});
      return {
        activeAction: { ...action, status: 'approved' },
        agents: state.agents.map((a) =>
          a.id === action.agentId
            ? { ...a, status: 'executing' }
            : a
        ),
      };
    }),

  denyAction: (actionId) =>
    set((state) => {
      const action = state.activeAction;
      if (!action || action.id !== actionId) return state;
      const agent = state.agents.find((a) => a.id === action.agentId);
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: action.agentId, agentName: agent?.name ?? action.agentId, tool: action.tool, action: 'denied', params: action.params }),
      }).catch(() => {});
      return {
        activeAction: { ...action, status: 'denied' },
        drawerOpen: false,
        agents: state.agents.map((a) =>
          a.id === action.agentId
            ? { ...a, status: 'idle', pendingAction: null }
            : a
        ),
      };
    }),

  completeAction: (actionId, result) =>
    set((state) => {
      const action = state.activeAction;
      if (!action || action.id !== actionId) return state;
      return {
        activeAction: null,
        drawerOpen: false,
        agents: state.agents.map((a) =>
          a.id === action.agentId
            ? {
                ...a,
                status: 'idle',
                pendingAction: null,
                log: [...a.log, { type: 'result' as LogType, content: `[${action.tool}] ${result}`, timestamp: Date.now() }],
              }
            : a
        ),
      };
    }),

  sendMessage: (message) =>
    set((state) => {
      const timestampedMessage = { ...message, timestamp: Date.now() };
      return { messages: [...state.messages, timestampedMessage] };
    }),

  getMessagesForAgent: (agentId): AgentMessage[] => {
    const current = useAgentStore.getState();
    return current.messages
      .filter((m: AgentMessage) => m.toAgentId === agentId)
      .sort((a: AgentMessage, b: AgentMessage) => b.timestamp - a.timestamp);
  },

  markMessageRead: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, status: 'read' as const } : m
      ),
    })),

  setDrawerOpen: (open) => set({ drawerOpen: open }),

  setLlmConfig: (config) => {
    try {
      localStorage.setItem(STORAGE_KEY, config.apiKey);
      localStorage.setItem('agentgrid_llm_config', JSON.stringify(config));
    } catch {}
    set({ llmConfig: config, settingsOpen: false });
  },

  clearApiKey: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('agentgrid_llm_config');
    } catch {}
    set({ llmConfig: { ...DEFAULT_LLM_CONFIG } });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  loadApiKeys: async () => {
    try {
      const res = await fetch('/api/api-keys');
      if (!res.ok) return;
      const { keys } = await res.json() as { keys: ApiKeyEntry[] };
      set({ apiKeys: keys });
    } catch {}
  },

  addApiKey: async (data) => {
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save API key');
    const { key } = await res.json() as { key: ApiKeyEntry };
    set((state) => ({ apiKeys: [key, ...state.apiKeys] }));
  },

  removeApiKey: async (id) => {
    await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
    set((state) => ({ apiKeys: state.apiKeys.filter((k) => k.id !== id) }));
  },

  getLlmConfigForAgent: (agentId) => {
    const state = get();
    const agent = state.agents.find((a) => a.id === agentId);
    if (agent?.apiKeyId) {
      const entry = state.apiKeys.find((k) => k.id === agent.apiKeyId);
      if (entry) {
        return {
          provider: entry.provider as LlmProvider,
          apiKey: '',
          model: entry.model,
          baseUrl: entry.baseUrl ?? undefined,
          apiKeyId: entry.id,
        };
      }
    }
    return state.llmConfig;
  },

  updateActionRetryCount: (actionId, count) =>
    set((state) => ({
      activeAction:
        state.activeAction?.id === actionId
          ? { ...state.activeAction, retryCount: count }
          : state.activeAction,
    })),
}));
