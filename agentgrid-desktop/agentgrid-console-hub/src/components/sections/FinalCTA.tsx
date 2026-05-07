import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Link } from "react-router-dom";

export const FinalCTA = () => {
  return (
    <section className="relative py-24 md:py-32">
      <div className="container">
        <div
          className="rounded-lg p-8 text-center md:p-14"
          style={{
            background: "#090D12",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2
            className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl"
            style={{ color: "#F8FAFC" }}
          >
            Stop switching tabs.
            <br />
            <span style={{ color: "#FFD23F" }}>Start running agents in parallel.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8" style={{ color: "#AAB2C0" }}>
            Local-first, no cloud proxy, no account needed. Download AgentGrid and keep every AI coding agent one keystroke away.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="violet" size="xl">
              <Link to="/download">
                <Download className="h-4 w-4" />
                Download Desktop App
              </Link>
            </Button>
            <Button asChild variant="glass" size="xl">
              <a href="/#product">
                See how it works
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
