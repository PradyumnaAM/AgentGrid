import { TerminalMockup } from "@/components/TerminalMockup";

export const Product = () => {
  return (
    <section id="product" className="relative py-24 md:py-32 overflow-hidden">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <SectionEyebrow>Desktop workspace</SectionEyebrow>
          <h2
            className="mt-4 font-display font-semibold text-4xl md:text-5xl tracking-tight leading-[1.05]"
            style={{ color: "#F8FAFC" }}
          >
            One workspace.{" "}
            <span style={{ color: "#FFD23F" }}>Every agent.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed" style={{ color: "#AAB2C0" }}>
            AgentGrid gives every AI coding agent its own real terminal pane.
            No chat wrappers, no proxied requests. Your CLIs, your machine, your rules.
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <TerminalMockup />
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              number: "01",
              title: "Pick a folder",
              desc: "Set the working directory once. Every pane inherits it.",
            },
            {
              number: "02",
              title: "Choose your agents",
              desc: "Assign Codex, Claude Code, Gemini, or a shell to each pane.",
            },
            {
              number: "03",
              title: "Launch and compare",
              desc: "Watch agents work in parallel. Copy, diff, and ship.",
            },
          ].map((step) => (
            <div
              key={step.number}
              className="rounded-lg p-6"
              style={{
                background: "#090D12",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span className="font-mono text-xs" style={{ color: "#FFD23F" }}>{step.number}</span>
              <h3 className="mt-3 font-semibold text-base" style={{ color: "#F8FAFC" }}>{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#7B8494" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const SectionEyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em]" style={{ color: "#FFD23F", opacity: 0.85 }}>
    {children}
  </div>
);
