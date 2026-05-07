/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENTGRID_DOWNLOAD_WINDOWS_URL?: string;
  readonly VITE_AGENTGRID_RELEASE_NOTES_URL?: string;
  readonly VITE_AGENTGRID_RELEASE_URL?: string;
  readonly VITE_AGENTGRID_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
