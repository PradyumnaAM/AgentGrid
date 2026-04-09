import { create } from 'zustand';
import type { Session, Agent, AgentMessage } from '@/lib/types';
import { loadSessions, saveSession, deleteSession, importSession, downloadSession } from '@/lib/persistence';
import { estimateTokens, estimateCostFromText } from '@/lib/costTracker';

interface SessionStore {
  sessions: Session[];
  currentSessionId: string | null;
  historyOpen: boolean;

  createSession: (name: string, agents: Agent[]) => string;
  updateCurrentSession: (updates: Partial<Session>) => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  completeSession: (id: string) => void;
  exportSession: (id: string) => void;
  importSessionData: (json: string) => boolean;
  addTokens: (count: number) => void;
  addMessage: (message: AgentMessage) => void;
  setHistoryOpen: (open: boolean) => void;
  hydrateFromServer: () => Promise<void>;
}

function syncToServer(session: Session): void {
  fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  }).catch(() => {});
}

function deleteFromServer(id: string): void {
  fetch(`/api/sessions/${id}`, { method: 'DELETE' }).catch(() => {});
}

function createSessionRecord(name: string, agents: Agent[]): Session {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    agents,
    messages: [],
    startTime: Date.now(),
    endTime: null,
    status: 'active',
    estimatedTokens: 0,
    estimatedCost: 0,
  };
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: loadSessions(),
  currentSessionId: null,
  historyOpen: false,

  createSession: (name, agents) => {
    const session = createSessionRecord(name, agents);
    set((state) => {
      const sessions = [session, ...state.sessions];
      saveSession(session);
      return { sessions, currentSessionId: session.id };
    });
    syncToServer(session);
    return session.id;
  },

  updateCurrentSession: (updates) => {
    set((state) => {
      if (!state.currentSessionId) return state;
      const sessions = state.sessions.map((s) =>
        s.id === state.currentSessionId ? { ...s, ...updates } : s
      );
      const updated = sessions.find((s) => s.id === state.currentSessionId);
      if (updated) { saveSession(updated); syncToServer(updated); }
      return { sessions };
    });
  },

  loadSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (session) {
      set({ currentSessionId: id });
    }
  },

  deleteSession: (id) => {
    deleteSession(id);
    deleteFromServer(id);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
    }));
  },

  completeSession: (id) => {
    set((state) => {
      const sessions = state.sessions.map((s) =>
        s.id === id ? { ...s, status: 'completed' as const, endTime: Date.now() } : s
      );
      const updated = sessions.find((s) => s.id === id);
      if (updated) saveSession(updated);
      return { sessions };
    });
  },

  exportSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (session) downloadSession(session);
  },

  importSessionData: (json) => {
    const session = importSession(json);
    if (session) {
      set((state) => ({ sessions: [session, ...state.sessions] }));
      return true;
    }
    return false;
  },

  addTokens: (count) => {
    set((state) => {
      if (!state.currentSessionId) return state;
      const sessions = state.sessions.map((s) => {
        if (s.id !== state.currentSessionId) return s;
        const newTokens = s.estimatedTokens + count;
        const cost = estimateCostFromText(' '.repeat(count * 4), false);
        return { ...s, estimatedTokens: newTokens, estimatedCost: s.estimatedCost + cost };
      });
      const updated = sessions.find((s) => s.id === state.currentSessionId);
      if (updated) saveSession(updated);
      return { sessions };
    });
  },

  addMessage: (message) => {
    set((state) => {
      if (!state.currentSessionId) return state;
      const sessions = state.sessions.map((s) =>
        s.id === state.currentSessionId
          ? { ...s, messages: [...s.messages, message] }
          : s
      );
      const updated = sessions.find((s) => s.id === state.currentSessionId);
      if (updated) saveSession(updated);
      return { sessions };
    });
  },

  setHistoryOpen: (open) => set({ historyOpen: open }),

  hydrateFromServer: async () => {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) return;
      const { sessions: serverSessions } = await res.json() as { sessions: Session[] };
      set((state) => {
        const localIds = new Set(state.sessions.map((s) => s.id));
        const newSessions = serverSessions.filter((s) => !localIds.has(s.id));
        if (newSessions.length === 0) return state;
        const merged = [...newSessions, ...state.sessions].slice(0, 50);
        merged.forEach((s) => saveSession(s));
        return { sessions: merged };
      });
    } catch {}
  },
}));
