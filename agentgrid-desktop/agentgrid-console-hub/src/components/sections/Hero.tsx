import { Button } from "@/components/ui/button";
import { TerminalMockup } from "@/components/TerminalMockup";
import { Download, Github, ShieldCheck, TerminalSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { GITHUB_REPO_URL } from "@/lib/links";

const facts = ["Local processes", "Real terminal panes", "No cloud proxy"];

export const Hero = () => {
  return (
    <section className="relative overflow-hidden border-b border-hairline">
      <div className="container grid min-h-[calc(100svh-4rem)] items-center gap-12 py-16 lg:grid-cols-[0.88fr_1.12fr] lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 text-sm font-medium" style={{ color: "#FFD23F" }}>
            <TerminalSquare className="h-4 w-4" />
            Windows build available
          </div>

          <h1
            className="font-display text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl"
            style={{ color: "#F8FAFC" }}
          >
            Run coding agents side by side.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8" style={{ color: "#AAB2C0" }}>
            AgentGrid is a local desktop workspace for Codex, Claude Code, Gemini, and shells. Each agent gets a real terminal pane in the project folder you choose.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="violet" size="lg">
              <Link to="/#download">
                <Download className="h-4 w-4" />
                Download Desktop App
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" />
                View source
              </a>
            </Button>
          </div>

          <div className="mt-9 grid gap-3 text-sm sm:grid-cols-3" style={{ color: "#7B8494" }}>
            {facts.map((fact) => (
              <div key={fact} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" style={{ color: "#22C55E" }} />
                <span>{fact}</span>
              </div>
            ))}
          </div>
        </div>

        <TerminalMockup className="lg:translate-x-4" />
      </div>
    </section>
  );
};
