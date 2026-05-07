import { Link } from "react-router-dom";
import { Github } from "lucide-react";
import { GITHUB_RELEASES_URL, GITHUB_REPO_URL } from "@/lib/links";

export const SiteFooter = () => {
  return (
    <footer
      className="border-t mt-20"
      style={{ borderColor: "rgba(35,42,51,0.6)" }}
    >
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2.5" aria-label="AgentGrid home">
              <img
                src="/agentgrid-logo.png"
                alt=""
                className="h-8 w-8 shrink-0 object-contain"
                loading="lazy"
                decoding="async"
              />
              <span className="font-display font-semibold text-[15px]">
                <span style={{ color: "#F8FAFC" }}>Agent</span>
                <span style={{ color: "#FFD23F" }}>Grid</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ color: "#7B8494" }}>
              A desktop workspace for running multiple AI coding agents in real terminal panes, side by side.
            </p>
            <div className="mt-5 flex items-center gap-3" style={{ color: "#7B8494" }}>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          <FooterCol title="Product" links={[
            { label: "Download", href: "/#download" },
            { label: "Features", href: "/#features" },
            { label: "Supported Agents", href: "/#agents" },
          ]} />
          <FooterCol title="Resources" links={[
            { label: "GitHub", href: GITHUB_REPO_URL, external: true },
            { label: "Install notes", href: GITHUB_RELEASES_URL, external: true },
          ]} />
        </div>

        <div
          className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono"
          style={{ borderColor: "rgba(35,42,51,0.6)", color: "#7B8494" }}
        >
          <span>&copy; {new Date().getFullYear()} AgentGrid</span>
          <span>Built for developers, on your machine.</span>
        </div>
      </div>
    </footer>
  );
};

const FooterCol = ({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) => (
  <div>
    <h4
      className="text-xs font-mono uppercase tracking-widest mb-4"
      style={{ color: "#7B8494" }}
    >
      {title}
    </h4>
    <ul className="space-y-2.5 text-sm">
      {links.map((l) => (
        <li key={l.label}>
          {l.external ? (
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
              style={{ color: "#AAB2C0" }}
            >
              {l.label}
            </a>
          ) : (
            <Link
              to={l.href}
              className="hover:text-white transition-colors"
              style={{ color: "#AAB2C0" }}
            >
              {l.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  </div>
);
