'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface TutorialOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Increments each time the tutorial is opened; remounts inner UI so step resets to 1. */
  sessionId: number;
}

const STEPS = [
  {
    title: 'Welcome to AgentGrid',
    body: 'AgentGrid runs multiple AI agents in parallel. You control what they do, watch every log, and approve sensitive actions.',
    points: ['Use + in the left sidebar to add agents', 'Each agent gets its own card and live activity log'],
  },
  {
    title: 'Run agents safely',
    body: 'When an agent wants to use a tool, the Global Action Center opens so you can approve or deny it.',
    points: ['Review JSON payload before confirming', 'Use Deny to force agent to pick another path'],
  },
  {
    title: 'Configure your model',
    body: 'Open Settings to configure OpenAI or OpenAI-compatible providers, API keys, model names, and base URLs.',
    points: ['Use Test Connection before Save Settings', 'Provider config applies to all agents by default'],
  },
  {
    title: 'Track sessions and collaborate',
    body: 'Session history stores cost/tokens over time and lets you export or import previous workspaces.',
    points: ['Open Sessions in the sidebar', 'Use Tutorial anytime from Help > Tutorial'],
  },
];

function TutorialOverlayInner({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-zinc-950/95 p-5 text-white shadow-[0_30px_100px_-45px_rgba(0,0,0,0.95)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Tutorial {index + 1}/{STEPS.length}
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">{step.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/15 bg-white/[0.03] p-2 text-zinc-400 transition hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm leading-relaxed text-zinc-300">{step.body}</p>
          <div className="mt-4 space-y-2">
            {step.points.map((point) => (
              <div key={point} className="flex items-start gap-2 text-sm text-zinc-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setIndex((s) => Math.max(s - 1, 0))}
            disabled={isFirst}
            className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {isLast ? (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              Finish
            </button>
          ) : (
            <button
              onClick={() => setIndex((s) => Math.min(s + 1, STEPS.length - 1))}
              className="inline-flex items-center gap-1 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TutorialOverlay({ open, onClose, sessionId }: TutorialOverlayProps) {
  if (!open) return null;
  return <TutorialOverlayInner key={sessionId} onClose={onClose} />;
}
