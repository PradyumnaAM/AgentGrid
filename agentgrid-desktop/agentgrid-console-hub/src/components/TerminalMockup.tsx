import { cn } from "@/lib/utils";
import { ChevronDown, FolderGit2 } from "lucide-react";

const panes = [
  {
    agent: "Codex",
    color: "#22C55E",
    task: "src/auth/session.ts",
    lines: ["analyzing session lifecycle", "extracting token refresh", "updated refreshToken()", "tests passing 8/8"],
  },
  {
    agent: "Claude Code",
    color: "#FFD23F",
    task: "middleware/rate-limit.ts",
    lines: ["reading middleware entrypoint", "proposing sliding window", "added limiter guard", "12 tests green"],
    active: true,
  },
  {
    agent: "Gemini",
    color: "#60A5FA",
    task: "db/query-plan.sql",
    lines: ["explain analyze users", "seq scan cost 28", "suggest index users(email)", "estimated 38x faster"],
  },
  {
    agent: "Shell",
    color: "#7B8494",
    task: "local terminal",
    lines: ["$ npm run dev", "ready in 412ms", "localhost:5173", ""],
    shell: true,
  },
];

export const TerminalMockup = ({ className }: { className?: string }) => {
  return (
    <div className={cn("mockup-frame overflow-hidden rounded-lg", className)}>
      <div
        className="flex items-center justify-between gap-4 border-b px-4 py-3"
        style={{ background: "#090D12", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <FolderGit2 className="h-4 w-4 shrink-0" style={{ color: "#FFD23F" }} />
          <span className="truncate font-mono text-[11px]" style={{ color: "#AAB2C0" }}>
            ~/work/agentgrid
          </span>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Control label="4 panes" />
          <Control label="All agents" active />
        </div>
      </div>

      <div
        className="grid aspect-[16/10] grid-cols-1 gap-px font-mono text-[11px] sm:grid-cols-2"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        {panes.map((pane) => (
          <TerminalPane key={pane.agent} {...pane} />
        ))}
      </div>

      <div
        className="flex items-center justify-between border-t px-4 py-2 font-mono text-[11px]"
        style={{ background: "#090D12", borderColor: "rgba(255,255,255,0.08)", color: "#7B8494" }}
      >
        <span style={{ color: "#22C55E" }}>Auto-approve off</span>
        <span>local workspace</span>
      </div>
    </div>
  );
};

const Control = ({ label, active }: { label: string; active?: boolean }) => (
  <div
    className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px]"
    style={{
      background: active ? "rgba(255,210,63,0.08)" : "rgba(255,255,255,0.03)",
      borderColor: active ? "rgba(255,210,63,0.28)" : "rgba(255,255,255,0.08)",
      color: active ? "#FFD23F" : "#AAB2C0",
    }}
  >
    {label}
    <ChevronDown className="h-3 w-3" />
  </div>
);

const TerminalPane = ({
  agent,
  color,
  task,
  lines,
  active,
  shell,
}: {
  agent: string;
  color: string;
  task: string;
  lines: string[];
  active?: boolean;
  shell?: boolean;
}) => (
  <div
    className="min-h-[190px] overflow-hidden p-4"
    style={{ background: active ? "rgba(255,210,63,0.035)" : "#050608" }}
  >
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color }}>
          {agent}
        </span>
      </div>
      {!shell && (
        <span className="text-[10px]" style={{ color: "#22C55E" }}>
          running
        </span>
      )}
    </div>

    <div className="mb-2 truncate" style={{ color: "#F8FAFC" }}>
      <span style={{ color: "#FFD23F" }}>&gt; </span>
      {task}
    </div>

    <div className="space-y-1.5" style={{ color: "#7B8494" }}>
      {lines.map((line, index) => (
        <div key={`${agent}-${index}`} className="truncate leading-relaxed">
          {line || "\u00a0"}
        </div>
      ))}
    </div>
  </div>
);
