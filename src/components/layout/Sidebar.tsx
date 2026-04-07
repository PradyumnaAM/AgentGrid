'use client';

import { Separator } from '@/components/ui/separator';
import { Plus, Bot, Settings, History, ChevronDown, ChevronRight, Trash2, Download, Upload, DollarSign, Zap, BookOpen, LogOut } from 'lucide-react';
import { useAgentStore } from '@/store/useAgentStore';
import { useSessionStore } from '@/store/useSessionStore';
import { formatCost } from '@/lib/costTracker';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  onAddAgent: () => void;
  onOpenTutorial?: () => void;
}

export function Sidebar({ onAddAgent, onOpenTutorial }: SidebarProps) {
  const setSettingsOpen = useAgentStore((s) => s.setSettingsOpen);
  const llmConfig = useAgentStore((s) => s.llmConfig);
  const agents = useAgentStore((s) => s.agents);
  const sessions = useSessionStore((s) => s.sessions);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const historyOpen = useSessionStore((s) => s.historyOpen);
  const loadSession = useSessionStore((s) => s.loadSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const exportSession = useSessionStore((s) => s.exportSession);
  const setHistoryOpen = useSessionStore((s) => s.setHistoryOpen);

  const activeAgentCount = agents.filter((a) => a.status !== 'idle' && a.status !== 'error').length;

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const ok = useSessionStore.getState().importSessionData(text);
      if (!ok) alert('Invalid session file');
    };
    input.click();
  };

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-zinc-800 bg-zinc-950 text-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
          <Zap className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <span className="text-sm font-bold tracking-tight">AgentGrid</span>
      </div>

      <Separator className="bg-zinc-800" />

      <nav className="flex-1 overflow-auto p-3 space-y-4">
        {/* Agents section */}
        <div>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Agents</span>
            <button
              onClick={onAddAgent}
              className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              title="Add agent"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
            <div className="flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-zinc-500" />
              <span>All Agents</span>
            </div>
            {activeAgentCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-400">
                {activeAgentCount} active
              </span>
            )}
          </button>
        </div>

        {/* Sessions section */}
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="mb-1.5 flex w-full items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <span>Sessions</span>
            {historyOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          {historyOpen && (
            <div className="space-y-0.5">
              {sessions.length === 0 && (
                <p className="px-2 py-2 text-xs text-zinc-700 italic">No sessions yet</p>
              )}

              {sessions.slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                    session.id === currentSessionId
                      ? 'bg-violet-500/10 text-violet-300'
                      : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                  }`}
                  onClick={() => loadSession(session.id)}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      session.status === 'active' ? 'bg-emerald-400' :
                      session.status === 'completed' ? 'bg-zinc-600' : 'bg-red-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium leading-tight">{session.name}</p>
                    <p className="flex items-center gap-1 text-[10px] text-zinc-600 mt-0.5">
                      <DollarSign className="h-2 w-2" />
                      {formatCost(session.estimatedCost)} · {session.agents.length} agents
                    </p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                    <button
                      onClick={(e) => { e.stopPropagation(); exportSession(session.id); }}
                      className="rounded p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                      title="Export"
                    >
                      <Download className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      className="rounded p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleImport}
                className="mt-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 transition-colors"
              >
                <Upload className="h-3 w-3" />
                Import session
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Help</span>
          </div>
          <button
            onClick={onOpenTutorial}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Tutorial
          </button>
        </div>
      </nav>

      <Separator className="bg-zinc-800" />

      {/* Footer */}
      <div className="p-3 space-y-1">
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </button>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className={`h-1.5 w-1.5 rounded-full ${llmConfig.apiKey ? 'bg-emerald-400' : 'bg-red-500'}`} />
          <span className="text-[11px] text-zinc-600">
            {llmConfig.apiKey ? `${llmConfig.provider === 'openai' ? 'OpenAI' : 'Compatible'} key configured` : 'No API key - click Settings'}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
