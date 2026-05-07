import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";
import { createDownloadConfig } from "@/lib/downloads";

const renderAt = (path: string) => {
  window.history.pushState({}, "", path);
  return render(<App />);
};

describe("AgentGrid marketing site", () => {
  it("renders the homepage without account-era routes", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { name: /run coding agents side by side/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pricing/i })).not.toBeInTheDocument();
  });

  it("renders the homepage download section with a safe missing-installer state", () => {
    renderAt("/#download");

    expect(screen.getByRole("heading", { name: /get agentgrid for your machine/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view releases/i })).toHaveAttribute(
      "href",
      "https://github.com/PradyumnaAM/AgentGrid/releases",
    );
    expect(screen.queryByRole("link", { name: /download for windows/i })).not.toBeInTheDocument();
  });

  it("does not expose placeholder navigation links", () => {
    renderAt("/");

    const placeholderLinks = screen.queryAllByRole("link").filter((link) => link.getAttribute("href") === "#");
    expect(placeholderLinks).toHaveLength(0);
    expect(
      screen
        .getAllByRole("link", { name: /download desktop app/i })
        .some((link) => link.getAttribute("href") === "/download"),
    ).toBe(true);
  });

  it("redirects removed account-era and download routes to the desktop download flow", async () => {
    const downloadRoute = renderAt("/download");

    expect(await screen.findByRole("heading", { name: /get agentgrid for your machine/i })).toBeInTheDocument();

    downloadRoute.unmount();
    renderAt("/account");

    expect(await screen.findByRole("heading", { name: /get agentgrid for your machine/i })).toBeInTheDocument();
  });

  it("shows a 404 for unknown routes", () => {
    renderAt("/does-not-exist");

    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
  });

  it("builds env-driven Windows download config without fake links", () => {
    expect(createDownloadConfig({}).downloads.find((download) => download.id === "windows")).toMatchObject({
      available: false,
      href: undefined,
    });

    expect(
      createDownloadConfig({
        VITE_AGENTGRID_DOWNLOAD_WINDOWS_URL: "https://example.com/AgentGridSetup.exe",
        VITE_AGENTGRID_VERSION: "v1.2.3",
      }),
    ).toMatchObject({
      releaseVersion: "v1.2.3",
      downloads: expect.arrayContaining([
        expect.objectContaining({
          id: "windows",
          available: true,
          href: "https://example.com/AgentGridSetup.exe",
        }),
      ]),
    });
  });
});
