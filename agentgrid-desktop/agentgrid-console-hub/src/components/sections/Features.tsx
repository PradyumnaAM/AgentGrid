import { Columns3, Layers, Shield, BookMarked, Cpu, RotateCcw } from "lucide-react";
import { SectionEyebrow } from "./Product";

const features = [
  {
    icon: Columns3,
    variant: "gold" as const,
    title: "Multi-Terminal Workspace",
    desc: "Launch up to four terminal panes in a 2x2 grid. Every pane runs its own AI agent independently.",
  },
  {
    icon: Layers,
    variant: "green" as const,
    title: "Universal Agent Selector",
    desc: "Pick Codex, Claude Code, Gemini, or an empty shell from a single dropdown. Switch agents without restarting.",
  },
  {
    icon: Shield,
    variant: "gold" as const,
    title: "Human Approval Gates",
    desc: "Review every proposed change before it runs. Auto-approve is off by default; you stay in control.",
  },
  {
    icon: BookMarked,
    variant: "green" as const,
    title: "Saved Presets",
    desc: "Save your agent layout and folder configuration as a preset. Reload your exact workspace in one click.",
  },
  {
    icon: Cpu,
    variant: "gold" as const,
    title: "Local CLI Detection",
    desc: "AgentGrid scans your PATH on launch and surfaces which agents are installed, with install guidance for missing ones.",
  },
  {
    icon: RotateCcw,
    variant: "green" as const,
    title: "Resume Previous Sessions",
    desc: "Restore your last workspace and reconnect to any agents that are still running. No lost context.",
  },
];

export const Features = () => {
  return (
    <section id="features" className="relative py-24 md:py-32" style={{ background: "rgba(8,10,13,0.6)" }}>
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <SectionEyebrow>Features</SectionEyebrow>
          <h2
            className="mt-4 font-display font-semibold text-4xl md:text-5xl tracking-tight leading-[1.05]"
            style={{ color: "#F8FAFC" }}
          >
            Everything you need.{" "}
            <span style={{ color: "#22C55E" }}>Nothing you don't.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed" style={{ color: "#AAB2C0" }}>
            AgentGrid is a focused tool. No dashboards, no telemetry, no account required.
            Just a local desktop workspace that does one thing well.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-hairline md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="feature-card p-7">
              <div
                className={f.variant === "gold" ? "icon-box-gold" : "icon-box-green"}
                style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <f.icon style={{ width: 18, height: 18 }} />
              </div>
              <h3 className="mt-5 font-semibold text-[15px] tracking-tight" style={{ color: "#F8FAFC" }}>
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#7B8494" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
