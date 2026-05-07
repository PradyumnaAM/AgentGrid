import { Button } from "@/components/ui/button";
import { Download, Terminal, Apple } from "lucide-react";
import { SectionEyebrow } from "./Product";
import { downloads, releaseNotesUrl, releaseVersion, supportUrl } from "@/lib/downloads";

export const DownloadSection = () => {
  return (
    <section
      id="download"
      className="relative py-24 md:py-32"
      style={{ background: "rgba(8,10,13,0.8)" }}
    >
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <SectionEyebrow>Download</SectionEyebrow>
          <h2
            className="mt-4 font-display font-semibold text-4xl md:text-5xl tracking-tight leading-[1.05]"
            style={{ color: "#F8FAFC" }}
          >
            Get AgentGrid for{" "}
            <span style={{ color: "#FFD23F" }}>your machine.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed" style={{ color: "#AAB2C0" }}>
            A local desktop app. No accounts, no subscriptions. Install in under a minute.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {downloads.map((p) => {
            const Icon = p.id === "windows" ? WindowsIcon : p.id === "macos" ? Apple : Terminal;

            return (
            <div
              key={p.id}
              className="rounded-lg p-6 flex flex-col"
              style={{
                background: "linear-gradient(180deg, rgba(17,22,29,0.92), rgba(8,10,13,0.96))",
                border: p.available
                  ? "1px solid rgba(255,204,51,0.30)"
                  : "1px solid rgba(255,255,255,0.06)",
                opacity: p.available ? 1 : 0.55,
              }}
            >
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center mb-5"
                style={{
                  background: p.available ? "rgba(255,210,63,0.10)" : "rgba(255,255,255,0.04)",
                  border: p.available ? "1px solid rgba(255,210,63,0.28)" : "1px solid rgba(255,255,255,0.06)",
                  color: p.available ? "#FFD23F" : "#7B8494",
                }}
              >
                <Icon style={{ width: 18, height: 18 }} />
              </div>
              <div className="font-semibold text-lg" style={{ color: "#F8FAFC" }}>{p.name}</div>
              <div className="text-sm mt-0.5 mb-5" style={{ color: "#7B8494" }}>{p.sub}</div>

              {p.available && p.href ? (
                <Button asChild variant="violet" className="w-full mt-auto">
                  <a href={p.href} rel="noreferrer">
                    <Download className="h-4 w-4" />
                    Download for {p.name}
                  </a>
                </Button>
              ) : p.id === "windows" ? (
                <a
                  href={supportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full rounded-md px-4 py-2.5 text-center text-sm font-medium mt-auto transition-colors"
                  style={{
                    background: "rgba(255,210,63,0.08)",
                    border: "1px solid rgba(255,210,63,0.22)",
                    color: "#FFD23F",
                  }}
                >
                  View releases
                </a>
              ) : (
                <div
                  className="w-full rounded-md px-4 py-2.5 text-center text-sm font-medium mt-auto"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#7B8494",
                  }}
                >
                  Coming soon
                </div>
              )}
            </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto mt-10 grid gap-4 md:grid-cols-3">
          <ReleaseNote label="Version" value={releaseVersion} />
          <ReleaseNote label="Release notes" value="GitHub releases" href={releaseNotesUrl} />
          <ReleaseNote label="Install help" value="CLI prerequisites" href={supportUrl} />
        </div>

        <div className="max-w-xl mx-auto mt-8 text-center">
          <p className="text-sm leading-relaxed" style={{ color: "#7B8494" }}>
            AgentGrid runs local terminal sessions. Codex, Claude Code, and Gemini must be installed separately on your machine.
          </p>
          {!downloads.some((download) => download.available) && (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "#AAB2C0" }}>
              The direct Windows installer link is not published on this build yet. Use GitHub releases for the latest available package.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

const ReleaseNote = ({ label, value, href }: { label: string; value: string; href?: string }) => (
  <div
    className="rounded-lg px-4 py-3 text-sm"
    style={{ background: "#090D12", border: "1px solid rgba(255,255,255,0.08)" }}
  >
    <div className="font-mono text-xs" style={{ color: "#7B8494" }}>{label}</div>
    {href ? (
      <a href={href} target="_blank" rel="noreferrer" className="mt-1 block transition-colors" style={{ color: "#FFD23F" }}>
        {value}
      </a>
    ) : (
      <div className="mt-1" style={{ color: "#F8FAFC" }}>{value}</div>
    )}
  </div>
);

function WindowsIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" style={style} fill="currentColor" aria-hidden>
      <path d="M3 5.5L11 4.3v7.2H3V5.5zm0 13L11 19.7v-7.1H3v5.9zm9 1.3l9 1.2v-8.4h-9v7.2zM12 4.1v7.4h9V2.9L12 4.1z" />
    </svg>
  );
}
