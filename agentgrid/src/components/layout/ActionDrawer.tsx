'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/store/useAgentStore';
import { Shield, Check, X, Clock, Terminal, User } from 'lucide-react';

const TOOL_DESCRIPTIONS: Record<string, { desc: string; risk: 'low' | 'medium' | 'high' }> = {
  create_file: { desc: 'Creates a new file in the workspace', risk: 'low' },
  read_file:   { desc: 'Reads the contents of a file', risk: 'low' },
  read_dir:    { desc: 'Lists files in a directory', risk: 'low' },
  edit_file:   { desc: 'Modifies an existing file', risk: 'medium' },
  search:      { desc: 'Searches for files by name', risk: 'low' },
  send_message:{ desc: 'Sends a message to another agent', risk: 'low' },
};

const riskColors = {
  low:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  high:   'text-red-400 bg-red-500/10 border-red-500/20',
};

export function ActionDrawer() {
  const activeAction = useAgentStore((s) => s.activeAction);
  const drawerOpen = useAgentStore((s) => s.drawerOpen);
  const setDrawerOpen = useAgentStore((s) => s.setDrawerOpen);
  const approveAction = useAgentStore((s) => s.approveAction);
  const denyAction = useAgentStore((s) => s.denyAction);
  const agents = useAgentStore((s) => s.agents);

  if (!activeAction) return null;

  const agent = agents.find((a) => a.id === activeAction.agentId);
  const toolInfo = TOOL_DESCRIPTIONS[activeAction.tool];

  const handleApprove = () => {
    approveAction(activeAction.id);
    setTimeout(() => setDrawerOpen(false), 1500);
  };

  const handleDeny = () => {
    denyAction(activeAction.id);
  };

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent className="flex w-full max-w-[560px] flex-col gap-0 border-l border-white/10 bg-zinc-950/90 p-0 text-white backdrop-blur-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Shield className="h-4 w-4 text-violet-300" />
          </div>
          <div>
            <SheetTitle className="text-base font-semibold text-white">Global Action Center</SheetTitle>
            <p className="text-sm text-zinc-500">Review tool approvals before execution</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <User className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="text-sm text-zinc-500">Agent</span>
              <span className="ml-auto text-sm font-medium text-white">{agent?.name ?? activeAction.agentId}</span>
            </div>
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <Terminal className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="text-sm text-zinc-500">Tool</span>
              <div className="ml-auto flex items-center gap-2">
                <code className="rounded-md border border-white/10 bg-black/30 px-2 py-0.5 text-sm font-mono text-violet-200">
                  {activeAction.tool}
                </code>
                {toolInfo && (
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${riskColors[toolInfo.risk]}`}>
                    {toolInfo.risk}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="text-sm text-zinc-500">Time</span>
              <span className="ml-auto text-sm text-zinc-400">
                {new Date(activeAction.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {activeAction.retryCount != null && activeAction.retryCount > 0 && (
              <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
                <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                  Retrying ({activeAction.retryCount}/3)…
                </span>
              </div>
            )}
          </div>

          {toolInfo && (
            <p className="px-1 text-sm text-zinc-500">{toolInfo.desc}</p>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <div className="border-b border-white/10 px-4 py-2.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">JSON Payload</span>
            </div>
            <pre className="max-h-72 overflow-auto p-4 text-sm font-mono leading-relaxed text-zinc-300">
              {JSON.stringify(activeAction.params, null, 2)}
            </pre>
          </div>
        </div>

        <div className="border-t border-white/10 p-4 space-y-2">
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-emerald-500/90 font-medium text-white hover:bg-emerald-500"
              onClick={handleApprove}
            >
              <Check className="mr-1.5 h-4 w-4" />
              Confirm
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-white/15 bg-white/[0.02] text-zinc-300 hover:border-red-700/60 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleDeny}
            >
              <X className="mr-1.5 h-4 w-4" />
              Deny
            </Button>
          </div>
          <p className="text-center text-[11px] text-zinc-600">
            Denied actions are reported back to the agent
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
