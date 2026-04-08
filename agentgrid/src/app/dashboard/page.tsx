'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/layout/Dashboard';
import { ActionDrawer } from '@/components/layout/ActionDrawer';
import { ApiKeyManager } from '@/components/settings/ApiKeyManager';
import { TutorialOverlay } from '@/components/layout/TutorialOverlay';
import { useAgentStore } from '@/store/useAgentStore';
import { Bot, Key, X } from 'lucide-react';

function AddAgentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, apiKeyId?: string) => void }) {
  const agents = useAgentStore((s) => s.agents);
  const apiKeys = useAgentStore((s) => s.apiKeys);
  const [name, setName] = useState(`Agent ${agents.length + 1}`);
  const [apiKeyId, setApiKeyId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(name.trim() || `Agent ${agents.length + 1}`, apiKeyId || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-950 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Bot className="h-4 w-4 text-violet-300" />
            </div>
            <h2 className="text-base font-semibold">New Agent</h2>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Agent name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400/40"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Key className="h-3 w-3" />
              API key
            </label>
            <select
              value={apiKeyId}
              onChange={(e) => setApiKeyId(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none"
            >
              <option value="">Use global default</option>
              {apiKeys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({k.config.model})
                </option>
              ))}
            </select>
            {apiKeys.length === 0 && (
              <p className="mt-1 text-[11px] text-zinc-600">Add keys in Settings to assign per-agent.</p>
            )}
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-white/15 bg-white/[0.03] py-2 text-sm text-zinc-400 transition hover:bg-white/[0.06]">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 rounded-xl bg-violet-500 py-2 text-sm font-semibold text-white transition hover:bg-violet-400">
            Spawn Agent
          </button>
        </div>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  const agents = useAgentStore((s) => s.agents);
  const addAgent = useAgentStore((s) => s.addAgent);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialSessionId, setTutorialSessionId] = useState(0);
  const [addAgentOpen, setAddAgentOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (!window.localStorage.getItem('agentgrid_tutorial_seen')) {
          setTutorialSessionId((s) => s + 1);
          setTutorialOpen(true);
        }
      } catch {
        /* ignore */
      }
    });
  }, []);

  const openTutorial = () => {
    setTutorialSessionId((s) => s + 1);
    setTutorialOpen(true);
  };

  const closeTutorial = () => {
    window.localStorage.setItem('agentgrid_tutorial_seen', '1');
    setTutorialOpen(false);
  };

  const handleAddAgent = (name?: string, apiKeyId?: string) => {
    const count = agents.length + 1;
    addAgent({
      id: `agent-${Date.now()}`,
      name: name ?? `Agent ${count}`,
      role: 'General Purpose',
      status: 'idle',
      pendingAction: null,
      log: [],
      apiKeyId,
    });
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      <Sidebar onAddAgent={() => setAddAgentOpen(true)} onOpenTutorial={openTutorial} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Dashboard />
      </main>
      <ActionDrawer />
      <ApiKeyManager />
      <TutorialOverlay open={tutorialOpen} onClose={closeTutorial} sessionId={tutorialSessionId} />
      {addAgentOpen && (
        <AddAgentModal
          onClose={() => setAddAgentOpen(false)}
          onAdd={handleAddAgent}
        />
      )}
    </div>
  );
}
