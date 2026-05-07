import { GITHUB_RELEASES_URL } from "@/lib/links";

export type PlatformDownload = {
  id: "windows" | "macos" | "linux";
  name: string;
  sub: string;
  available: boolean;
  href?: string;
};

type DownloadEnv = {
  VITE_AGENTGRID_DOWNLOAD_WINDOWS_URL?: string;
  VITE_AGENTGRID_RELEASE_NOTES_URL?: string;
  VITE_AGENTGRID_RELEASE_URL?: string;
  VITE_AGENTGRID_VERSION?: string;
};

const firstNonEmpty = (...values: Array<string | undefined>) =>
  values.map((value) => value?.trim()).find(Boolean);

const safeUrl = (value?: string) => {
  if (!value) return undefined;

  try {
    const origin = globalThis.location?.origin ?? "https://agentgrid.local";
    const url = new URL(value, origin);
    return ["http:", "https:"].includes(url.protocol) || value.startsWith("/") ? value : undefined;
  } catch {
    return undefined;
  }
};

export const createDownloadConfig = (env: DownloadEnv) => {
  const windowsHref = safeUrl(env.VITE_AGENTGRID_DOWNLOAD_WINDOWS_URL);

  return {
    releaseVersion: firstNonEmpty(env.VITE_AGENTGRID_VERSION, "Latest release") ?? "Latest release",
    releaseNotesUrl:
      safeUrl(firstNonEmpty(env.VITE_AGENTGRID_RELEASE_NOTES_URL, env.VITE_AGENTGRID_RELEASE_URL)) ??
      GITHUB_RELEASES_URL,
    supportUrl: GITHUB_RELEASES_URL,
    downloads: [
      {
        id: "windows",
        name: "Windows",
        sub: "10, 11 x64",
        available: Boolean(windowsHref),
        href: windowsHref,
      },
      {
        id: "macos",
        name: "macOS",
        sub: "Not released yet",
        available: false,
      },
      {
        id: "linux",
        name: "Linux",
        sub: "Not released yet",
        available: false,
      },
    ] satisfies PlatformDownload[],
  };
};

export const { downloads, releaseNotesUrl, releaseVersion, supportUrl } = createDownloadConfig(import.meta.env);
