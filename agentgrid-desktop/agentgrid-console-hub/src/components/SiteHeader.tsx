import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div
        className="absolute inset-0 -z-10 border-b"
        style={{
          background: "rgba(5,6,8,0.82)",
          borderColor: "rgba(35,42,51,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      />
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" aria-label="AgentGrid home">
          <img
            src="/agentgrid-logo.png"
            alt=""
            className="h-8 w-8 shrink-0 object-contain"
            loading="eager"
            decoding="async"
          />
          <span className="font-display font-semibold text-[15px] tracking-tight">
            <span style={{ color: "#F8FAFC" }}>Agent</span>
            <span style={{ color: "#FFD23F" }}>Grid</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm" style={{ color: "#AAB2C0" }}>
          <a href="/#features" className="hover:text-white transition-colors">Features</a>
          <a href="/#agents" className="hover:text-white transition-colors">Agents</a>
          <Link to="/#download" className="hover:text-white transition-colors">Download</Link>
        </nav>

        <Button asChild variant="violet" className="min-h-11 px-3 sm:px-3.5">
          <Link to="/#download">
            <Download className="h-3.5 w-3.5" />
            <span className="sm:hidden">Download</span>
            <span className="hidden sm:inline">Download Desktop App</span>
          </Link>
        </Button>
      </div>
    </header>
  );
};
