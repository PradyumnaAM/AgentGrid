'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Play, Clock } from 'lucide-react';
import { useAgentStore } from '@/store/useAgentStore';

interface ScheduledAgent {
  id: string;
  name: string;
  task: string;
  cronExpression: string;
  enabled: boolean;
}

export function ScheduledAgentsPanel() {
  const [agents, setAgents] = useState<ScheduledAgent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [task, setTask] = useState('');
  const [cron, setCron] = useState('0 * * * *');
  const [apiKeyId, setApiKeyId] = useState('');
  const apiKeys = useAgentStore((s) => s.apiKeys);
  const llmConfig = useAgentStore((s) => s.llmConfig);

  const load = () => {
    fetch('/api/scheduled-agents')
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = apiKeys.find((k) => k.id === apiKeyId);
    const llmConfigJson = JSON.stringify(key
      ? { provider: key.provider, apiKey: '', model: key.model, baseUrl: key.baseUrl, apiKeyId: key.id }
      : llmConfig);
    await fetch('/api/scheduled-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, task, cronExpression: cron, enabled: true, llmConfigJson }),
    });
    setName(''); setTask(''); setCron('0 * * * *'); setShowForm(false);
    load();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/scheduled-agents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/scheduled-agents/${id}`, { method: 'DELETE' });
    load();
  };

  const trigger = async (id: string) => {
    await fetch(`/api/scheduled-agents/${id}/trigger`, { method: 'POST' });
  };

  return (
    <div className="space-y-0.5">
      {agents.length === 0 && !showForm && (
        <p className="px-2 py-2 text-xs text-zinc-700 italic">No scheduled agents</p>
      )}

      {agents.map((a) => (
        <div key={a.id} className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800/70">
          <Clock className="h-3 w-3 shrink-0 text-zinc-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-zinc-300">{a.name}</p>
            <p className="truncate text-[10px] text-zinc-600">{a.cronExpression}</p>
          </div>
          <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
            <button onClick={() => trigger(a.id)} title="Run now" className="rounded p-0.5 text-zinc-600 hover:text-emerald-400 transition">
              <Play className="h-2.5 w-2.5" />
            </button>
            <button onClick={() => remove(a.id)} title="Delete" className="rounded p-0.5 text-zinc-600 hover:text-red-400 transition">
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
          <button
            onClick={() => toggle(a.id, a.enabled)}
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium transition ${
              a.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-600'
            }`}
          >
            {a.enabled ? 'on' : 'off'}
          </button>
        </div>
      ))}

      {showForm ? (
        <form onSubmit={handleCreate} className="space-y-1.5 rounded-lg border border-white/10 bg-zinc-900 p-2 mt-1">
          <input
            value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required
            className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white placeholder-zinc-600 focus:outline-none"
          />
          <textarea
            value={task} onChange={(e) => setTask(e.target.value)} placeholder="Task description" required rows={2}
            className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white placeholder-zinc-600 focus:outline-none resize-none"
          />
          <input
            value={cron} onChange={(e) => setCron(e.target.value)} placeholder="Cron (e.g. 0 * * * *)" required
            className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white placeholder-zinc-600 focus:outline-none"
          />
          {apiKeys.length > 0 && (
            <select value={apiKeyId} onChange={(e) => setApiKeyId(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white focus:outline-none">
              <option value="">Default API key</option>
              {apiKeys.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          )}
          <div className="flex gap-1">
            <button type="submit" className="flex-1 rounded-md bg-violet-500 py-1 text-[11px] font-semibold text-white hover:bg-violet-400 transition">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-md border border-white/10 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-0.5 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 transition-colors"
        >
          <Plus className="h-3 w-3" />
          New scheduled agent
        </button>
      )}
    </div>
  );
}
