'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/store/useAgentStore';
import { useShallow } from 'zustand/react/shallow';
import { runAgentLoop } from '@/lib/agentLoop';
import type { Agent, LogEntry, RateLimitInfo } from '@/lib/types';
import {
  Bot,
  Trash2,
  Send,
  Mail,
  X,
  AlertTriangle,
  Clock,
} from 'lucide-react';

// ── Rate limit progress bar ──────────────────────────────────────────────────

function formatTokenCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function UsageBar({ rateLimit }: { rateLimit?: RateLimitInfo }) {
  if (!rateLimit || rateLimit.tokensLimit === 0) return null;
  const used = rateLimit.tokensLimit - rateLimit.tokensRemaining;
  const pct = Math.min(100, (used / rateLimit.tokensLimit) * 100);
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="mx-3 mt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">LLM Usage</span>
        <span className="text-[10px] text-zinc-500">
          {formatTokenCount(used)} / {formatTokenCount(rateLimit.tokensLimit)} tok
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Reset countdown timer ────────────────────────────────────────────────────

function CountdownTimer({ resetAt }: { resetAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, resetAt - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, resetAt - Date.now());
      setRemaining(r);
      if (r === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [resetAt]);

  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  const label = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
      <Clock className="h-3.5 w-3.5 shrink-0 text-red-400" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-red-300">Rate limit reached</p>
        <p className="text-[11px] text-red-400/70">Resets in {remaining > 0 ? label : 'a moment…'}</p>
      </div>
    </div>
  );
}

const statusConfig: Record<Agent['status'], { label: string; dot: string; pulse: string }> = {
  idle: { label: 'idle', dot: 'bg-zinc-500/70', pulse: 'bg-zinc-500/40' },
  thinking: { label: 'thinking', dot: 'bg-emerald-400', pulse: 'bg-emerald-400/40' },
  executing: { label: 'executing', dot: 'bg-emerald-400', pulse: 'bg-emerald-400/40' },
  waiting_approval: { label: 'awaiting approval', dot: 'bg-amber-400', pulse: 'bg-amber-400/40' },
  error: { label: 'error', dot: 'bg-zinc-500/70', pulse: 'bg-zinc-500/40' },
};

const logStyles: Record<LogEntry['type'], { text: string; label: string }> = {
  thought: { text: 'text-zinc-400', label: 'think' },
  action:  { text: 'text-violet-400', label: 'tool' },
  result:  { text: 'text-emerald-400', label: 'done' },
  error:   { text: 'text-red-400', label: 'err' },
  system:  { text: 'text-zinc-500', label: 'sys' },
  message: { text: 'text-amber-400', label: 'msg' },
};

interface AgentCardProps {
  agent: Agent;
  cardScale?: 'compact' | 'comfortable' | 'expanded';
}

export function AgentCard({ agent, cardScale = 'comfortable' }: AgentCardProps) {
  const removeAgent = useAgentStore((s) => s.removeAgent);
  const llmConfig = useAgentStore((s) => s.llmConfig);
  const messages = useAgentStore(
    useShallow((s) => s.messages.filter((m) => m.toAgentId === agent.id).sort((a, b) => b.timestamp - a.timestamp))
  );
  const markMessageRead = useAgentStore((s) => s.markMessageRead);
  const [task, setTask] = useState('');
  const [msgOpen, setMsgOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const warned50Ref = useRef(false);
  const warned90Ref = useRef(false);
  const [activeWarning, setActiveWarning] = useState<'50' | '90' | null>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [agent.log.length]);

  // Trigger usage warnings when thresholds are crossed
  useEffect(() => {
    const rl = agent.rateLimit;
    if (!rl || rl.tokensLimit === 0) return;
    const pct = ((rl.tokensLimit - rl.tokensRemaining) / rl.tokensLimit) * 100;
    if (pct >= 90 && !warned90Ref.current) {
      warned90Ref.current = true;
      setActiveWarning('90');
    } else if (pct >= 50 && !warned50Ref.current) {
      warned50Ref.current = true;
      setActiveWarning('50');
    }
  }, [agent.rateLimit]);

  // Reset warning state when a new task starts
  useEffect(() => {
    if (agent.status === 'thinking') {
      warned50Ref.current = false;
      warned90Ref.current = false;
      setActiveWarning(null);
    }
  }, [agent.status]);

  const config = statusConfig[agent.status];
  const unreadCount = messages.filter((m) => m.status !== 'read').length;
  const isActive = agent.status === 'thinking' || agent.status === 'executing' || agent.status === 'waiting_approval';
  const hasLlmConfig = Boolean(llmConfig.apiKey.trim() && llmConfig.model.trim());
  const logHeightClass =
    cardScale === 'compact' ? 'max-h-28' : cardScale === 'expanded' ? 'max-h-60' : 'max-h-44';
  const minHeightClass =
    cardScale === 'compact' ? 'min-h-[290px]' : cardScale === 'expanded' ? 'min-h-[390px]' : 'min-h-[330px]';

  const handleRun = async () => {
    if (!task.trim() || !hasLlmConfig) return;
    setTask('');
    await runAgentLoop({ agentId: agent.id, task: task.trim() });
  };

  const handleMsgOpen = () => {
    setMsgOpen(true);
    messages.filter((m) => m.status !== 'read').forEach((m) => markMessageRead(m.id));
  };

  return (
    <div className={`relative flex h-full ${minHeightClass} flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_12px_36px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all duration-200 hover:border-white/20`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.12),transparent_45%)]" />
      <div className="relative flex items-start justify-between border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/80">
            <Bot className="h-4 w-4 text-zinc-300" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white">{agent.name}</h3>
            <p className="truncate text-xs text-zinc-500">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMsgOpen}
              className="relative flex h-6 w-6 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 transition-colors hover:bg-amber-500/20"
            >
              <Mail className="h-3 w-3" />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-semibold text-black">
                {unreadCount}
              </span>
            </button>
          )}
          <Badge variant="outline" className="border-white/15 bg-zinc-900/80 px-1.5 py-0 text-[11px] capitalize text-zinc-300">
            <span className="relative mr-1 inline-flex h-1.5 w-1.5 items-center justify-center">
              <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
              {isActive && <span className={`absolute h-1.5 w-1.5 animate-ping rounded-full ${config.pulse}`} />}
            </span>
            {config.label}
          </Badge>
        </div>
      </div>

      <UsageBar rateLimit={agent.rateLimit} />

      {activeWarning && (
        <div className={`mx-3 mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 ${activeWarning === '90' ? 'border-red-500/30 bg-red-500/10' : 'border-amber-400/30 bg-amber-400/10'}`}>
          <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${activeWarning === '90' ? 'text-red-400' : 'text-amber-400'}`} />
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-medium ${activeWarning === '90' ? 'text-red-300' : 'text-amber-300'}`}>
              {activeWarning === '90' ? '90% of rate limit used' : '50% of rate limit used'}
            </p>
            <p className={`text-[11px] ${activeWarning === '90' ? 'text-red-400/70' : 'text-amber-400/70'}`}>
              {activeWarning === '90' ? 'Approaching limit — agent may pause soon' : 'Half your quota used in this window'}
            </p>
          </div>
          <button onClick={() => setActiveWarning(null)} className="shrink-0 text-zinc-600 transition hover:text-zinc-400">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {agent.rateLimit?.tokensRemaining === 0 && agent.rateLimit.tokensResetAt && (
        <CountdownTimer resetAt={agent.rateLimit.tokensResetAt} />
      )}

      <div className="relative mx-3 mt-3 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/30">
        <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Live Log</span>
          <span className="text-[11px] text-zinc-500">{agent.log.length} entries</span>
        </div>
        <div ref={logRef} className={`h-full ${logHeightClass} overflow-y-auto px-2.5 py-2 font-mono text-xs leading-relaxed`}>
          {agent.log.length === 0 ? (
            <p className="pt-2 text-center text-xs italic text-zinc-600">No events yet</p>
          ) : (
            agent.log.map((entry, i) => {
              const style = logStyles[entry.type];
              return (
                <div key={i} className="mb-1 flex items-start gap-1.5">
                  <span className={`mt-0.5 shrink-0 rounded border border-current/15 px-1 py-px text-[9px] uppercase tracking-wide ${style.text}`}>
                    {style.label}
                  </span>
                  <p className={`${style.text} break-all`}>{entry.content}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Message inbox */}
      {msgOpen && messages.length > 0 && (
        <div className="mx-3 mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-amber-500/20 px-2.5 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-amber-500/70">Messages</span>
            <button onClick={() => setMsgOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="max-h-32 overflow-auto p-2 space-y-1.5">
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-md border border-zinc-800 bg-zinc-900/80 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-amber-400">From {msg.fromAgentName}</span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative mt-3 flex items-center gap-2 border-t border-white/10 px-3 py-2.5">
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRun()}
          placeholder={!hasLlmConfig ? 'Configure LLM key/model in Settings...' : 'Give this agent a task...'}
          disabled={agent.status !== 'idle' || !hasLlmConfig}
          className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 disabled:opacity-40"
        />
        <Button
          size="icon-sm"
          className="shrink-0 bg-violet-500/90 text-white hover:bg-violet-500 disabled:opacity-40"
          onClick={handleRun}
          disabled={agent.status !== 'idle' || !task.trim() || !hasLlmConfig}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="shrink-0 text-zinc-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
          onClick={() => removeAgent(agent.id)}
          disabled={agent.status !== 'idle'}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
