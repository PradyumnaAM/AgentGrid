import type { Session } from '@/lib/types';

const SESSIONS_KEY = 'agentgrid_sessions';
const MAX_SESSIONS = 50;

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSession(session: Session): void {
  try {
    const sessions = loadSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);

    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }

    while (sessions.length > MAX_SESSIONS) {
      sessions.pop();
    }

    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {}
}

export function deleteSession(id: string): void {
  try {
    const sessions = loadSessions().filter((s) => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {}
}

export function clearAllSessions(): void {
  try {
    localStorage.removeItem(SESSIONS_KEY);
  } catch {}
}

export function downloadSession(session: Session): void {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agentgrid-session-${session.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importSession(json: string): Session | null {
  try {
    const session = JSON.parse(json);
    if (session.id && session.agents && Array.isArray(session.messages)) {
      saveSession(session);
      return session;
    }
  } catch {}
  return null;
}
