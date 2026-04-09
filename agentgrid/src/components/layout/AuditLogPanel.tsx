'use client';

import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { AuditEntry } from '@/lib/types';

type Filter = 'all' | 'approved' | 'denied' | 'error';

interface AuditLogPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AuditLogPanel({ open, onClose }: AuditLogPanelProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/audit-logs')
      .then((r) => r.json())
      .then((data) => setLogs(data.logs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.action === filter);

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-[400px] flex-col border-l border-white/10 bg-zinc-950/95 backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <Shield className="h-4 w-4 text-violet-300" />
        <span className="flex-1 text-sm font-semibold">Audit Log</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-1 border-b border-white/10 px-4 py-2">
        {(['all', 'approved', 'denied', 'error'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition ${
              filter === f
                ? 'bg-violet-500/20 text-violet-300'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {loading && <p className="py-8 text-center text-xs text-zinc-600">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="py-8 text-center text-xs text-zinc-600 italic">No audit entries yet</p>
          )}
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              {entry.action === 'approved' && <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />}
              {entry.action === 'denied' && <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />}
              {entry.action === 'error' && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-300">{entry.agentName}</span>
                  <span className="text-zinc-600">·</span>
                  <code className="text-[10px] text-violet-300">{entry.tool}</code>
                </div>
                {entry.result && (
                  <p className="mt-0.5 truncate text-[10px] text-zinc-600">{entry.result}</p>
                )}
                <p className="mt-0.5 text-[10px] text-zinc-700">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
