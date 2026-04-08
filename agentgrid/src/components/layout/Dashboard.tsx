'use client';

import { useState, useEffect, useRef } from 'react';
import { useAgentStore } from '@/store/useAgentStore';
import { useSessionStore } from '@/store/useSessionStore';
import { AgentCard } from '@/components/agent/AgentCard';
import { WorkspaceFileTree } from '@/components/layout/WorkspaceFileTree';
import { FilePreview } from '@/components/layout/FilePreview';
import { FileText, DollarSign, Bot, Zap } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { formatCost } from '@/lib/costTracker';

const FILE_TOOLS = new Set(['create_file', 'edit_file']);

export function Dashboard() {
  const agents = useAgentStore((s) => s.agents);
  const sessions = useSessionStore((s) => s.sessions);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const [treeOpen, setTreeOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [cardScale, setCardScale] = useState<'compact' | 'comfortable' | 'expanded'>('comfortable');
  const prevLogCountRef = useRef(0);

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const activeCount = agents.filter((a) => a.status !== 'idle' && a.status !== 'error').length;

  // Refresh workspace tree whenever a file-mutating tool result is logged
  useEffect(() => {
    return useAgentStore.subscribe((state) => {
      let totalLogs = 0;
      let hasNewFileMutation = false;
      for (const agent of state.agents) {
        totalLogs += agent.log.length;
        if (agent.log.length > 0) {
          const last = agent.log[agent.log.length - 1];
          if (last.type === 'result' && Array.from(FILE_TOOLS).some((t) => last.content.startsWith(`[${t}]`))) {
            hasNewFileMutation = true;
          }
        }
      }
      if (hasNewFileMutation && totalLogs !== prevLogCountRef.current) {
        prevLogCountRef.current = totalLogs;
        setRefreshKey((k) => k + 1);
      }
    });
  }, []);

  if (agents.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <Bot className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-base font-medium text-zinc-400">No agents yet</p>
          <p className="mt-1 text-sm text-zinc-600">
            Click <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-zinc-400">+</kbd> in the sidebar to spawn an agent
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(167,139,250,0.12),transparent_40%)]" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="relative flex items-center justify-between border-b border-white/10 bg-zinc-950/70 px-6 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold tracking-tight text-white">BridgeMind Dashboard</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-sm text-zinc-400">
                {agents.length} agent{agents.length !== 1 ? 's' : ''}
              </span>
              {activeCount > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-sm text-emerald-300">
                  <Zap className="h-2.5 w-2.5" />
                  {activeCount} running
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-1 py-1">
              {(['compact', 'comfortable', 'expanded'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setCardScale(size)}
                  className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors ${
                    cardScale === size
                      ? 'bg-violet-400/20 text-violet-200'
                      : 'text-zinc-500 hover:bg-white/10 hover:text-zinc-300'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            {currentSession && (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm">
                <span className="max-w-32 truncate text-zinc-500">{currentSession.name}</span>
                <span className="text-zinc-700">|</span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <DollarSign className="h-3 w-3" />
                  {formatCost(currentSession.estimatedCost)}
                </span>
                <span className="text-zinc-600">
                  {currentSession.estimatedTokens.toLocaleString()} tok
                </span>
              </div>
            )}
            <button
              onClick={() => setTreeOpen(!treeOpen)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                treeOpen
                  ? 'border-violet-400/30 bg-violet-400/10 text-violet-300'
                  : 'border-white/10 bg-white/[0.02] text-zinc-500 hover:border-white/20 hover:text-zinc-300'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Workspace
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-auto p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {agents.map((agent) => (
              <ErrorBoundary key={agent.id}>
                <AgentCard agent={agent} cardScale={cardScale} />
              </ErrorBoundary>
            ))}
          </div>
        </div>
      </div>

      {treeOpen && (
        <div className="relative w-64 shrink-0 border-l border-white/10 bg-zinc-950/80 backdrop-blur-xl">
          <WorkspaceFileTree
            refreshTrigger={refreshKey}
            onFileSelect={setPreviewFile}
          />
        </div>
      )}

      <FilePreview filePath={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
