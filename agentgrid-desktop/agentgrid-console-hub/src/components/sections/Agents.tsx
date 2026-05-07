import { SectionEyebrow } from "./Product";
import { Terminal } from "lucide-react";

const agents = [
  {
    name: "Codex",
    desc: "OpenAI's code-focused model via CLI",
    color: "#22C55E",
    status: "supported",
    initial: "CX",
  },
  {
    name: "Claude Code",
    desc: "Anthropic's agentic coding assistant",
    color: "#FFD23F",
    status: "supported",
    initial: "CC",
  },
  {
    name: "Gemini",
    desc: "Google's multimodal coding CLI",
    color: "#60A5FA",
    status: "supported",
    initial: "GM",
  },
  {
    name: "Empty Terminal",
    desc: "Plain shell for any other CLI tool",
    color: "#7B8494",
    status: "supported",
    initial: "SH",
    isShell: true,
  },
  {
    name: "More coming soon",
    desc: "Additional agents in active development",
    color: "#7B8494",
    status: "soon",
    initial: "...",
  },
];

export const Agents = () => {
  return (
    <section id="agents" className="relative py-24 md:py-32">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <SectionEyebrow>Supported agents</SectionEyebrow>
          <h2
            className="mt-4 font-display font-semibold text-4xl md:text-5xl tracking-tight leading-[1.05]"
            style={{ color: "#F8FAFC" }}
          >
            Works with the agents{" "}
            <span style={{ color: "#FFD23F" }}>you already use.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed" style={{ color: "#AAB2C0" }}>
            AgentGrid doesn't bundle any models. It launches the CLIs you have installed on your machine, with no API proxying and no middleman.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="agent-badge rounded-lg p-5 flex items-center gap-4 min-w-[260px] flex-1"
              style={{ maxWidth: 320, opacity: agent.status === "soon" ? 0.6 : 1 }}
            >
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-sm"
                style={{
                  background: agent.isShell
                    ? "rgba(107,114,128,0.12)"
                    : `${agent.color}18`,
                  border: `1px solid ${agent.color}33`,
                  color: agent.color,
                }}
              >
                {agent.isShell ? <Terminal style={{ width: 16, height: 16 }} /> : agent.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: "#F8FAFC" }}>{agent.name}</span>
                  {agent.status === "supported" && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: "rgba(34,197,94,0.10)",
                        border: "1px solid rgba(34,197,94,0.28)",
                        color: "#22C55E",
                      }}
                    >
                      ready
                    </span>
                  )}
                  {agent.status === "soon" && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: "rgba(75,85,99,0.20)",
                        border: "1px solid rgba(75,85,99,0.35)",
                        color: "#7B8494",
                      }}
                    >
                      soon
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#7B8494" }}>{agent.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p
          className="text-center text-sm mt-10 font-mono"
          style={{ color: "#7B8494" }}
        >
          Codex, Claude Code, and Gemini must be installed separately on your machine.
        </p>
      </div>
    </section>
  );
};
