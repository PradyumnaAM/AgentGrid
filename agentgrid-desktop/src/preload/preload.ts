import { clipboard, contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import {
  IPC,
  type AppStatePatch,
  type BrowserPreviewCreateRequest,
  type BrowserPreviewLoadUrlRequest,
  type BrowserPreviewNavigateAction,
  type BrowserPreviewResult,
  type BrowserPreviewSetBoundsRequest,
  type BrowserPreviewStateEvent,
  type CliInstallCompletedEvent,
  type CliInstallMarkerReadResult,
  type CliInstallSession,
  type FolderSelectResult,
  type PersistedAppState,
  type PtyDataEvent,
  type PtyExitEvent,
  type PtySpawnRequest,
  type PtySpawnResponse,
} from '../shared/ipc';
import type { CliDetectionResult, CliKind } from '../shared/cli';

// Context isolation is on; everything the renderer touches goes through this bridge.
// No Node APIs, no remote module, no powerful globals — just a typed surface
// scoped to PTY IO.
const api = {
  spawn(req: PtySpawnRequest): Promise<PtySpawnResponse> {
    return ipcRenderer.invoke(IPC.ptySpawn, req);
  },
  write(id: string, data: string): Promise<void> {
    return ipcRenderer.invoke(IPC.ptyWrite, { id, data });
  },
  resize(id: string, cols: number, rows: number): Promise<void> {
    return ipcRenderer.invoke(IPC.ptyResize, { id, cols, rows });
  },
  kill(id: string): Promise<void> {
    return ipcRenderer.invoke(IPC.ptyKill, { id });
  },
  copyText(text: string): void {
    clipboard.writeText(text);
  },
  onData(listener: (evt: PtyDataEvent) => void): () => void {
    const handler = (_event: IpcRendererEvent, payload: PtyDataEvent) => listener(payload);
    ipcRenderer.on(IPC.ptyData, handler);
    return () => ipcRenderer.removeListener(IPC.ptyData, handler);
  },
  onExit(listener: (evt: PtyExitEvent) => void): () => void {
    const handler = (_event: IpcRendererEvent, payload: PtyExitEvent) => listener(payload);
    ipcRenderer.on(IPC.ptyExit, handler);
    return () => ipcRenderer.removeListener(IPC.ptyExit, handler);
  },
} as const;

export type AgentGridPtyApi = typeof api;

contextBridge.exposeInMainWorld('agentgridPty', api);

// CLI detection surface — deliberately separate from the PTY bridge so
// adding detection features cannot accidentally widen PTY IPC.
const cliApi = {
  detect(kind: CliKind, options?: { force?: boolean }): Promise<CliDetectionResult | null> {
    return ipcRenderer.invoke(IPC.cliDetect, { kind, force: options?.force === true });
  },
  detectAll(options?: { force?: boolean }): Promise<CliDetectionResult[]> {
    return ipcRenderer.invoke(IPC.cliDetectAll, { force: options?.force === true });
  },
  openInstall(kind: CliKind): Promise<void> {
    return ipcRenderer.invoke(IPC.cliInstallOpen, { kind });
  },
  onInstallCompleted(listener: (evt: CliInstallCompletedEvent) => void): () => void {
    const handler = (_event: IpcRendererEvent, payload: CliInstallCompletedEvent) => listener(payload);
    ipcRenderer.on(IPC.cliInstallCompleted, handler);
    return () => ipcRenderer.removeListener(IPC.cliInstallCompleted, handler);
  },
  installSession(): Promise<CliInstallSession | null> {
    return ipcRenderer.invoke(IPC.cliInstallSession);
  },
  readInstallMarker(): Promise<CliInstallMarkerReadResult> {
    return ipcRenderer.invoke(IPC.cliInstallMarkerRead);
  },
  finishInstall(exitCode: number): Promise<void> {
    return ipcRenderer.invoke(IPC.cliInstallFinished, { exitCode });
  },
  // Exposed so the renderer can pick the correct platform-specific install
  // command without snooping navigator.userAgent, which is unreliable under
  // Electron. Surface is deliberately narrow (value, not live callback).
  platform(): 'win32' | 'darwin' | 'linux' | 'other' {
    const p = process.platform;
    if (p === 'win32' || p === 'darwin' || p === 'linux') return p;
    return 'other';
  },
} as const;

export type AgentGridCliApi = typeof cliApi;

contextBridge.exposeInMainWorld('agentgridCli', cliApi);

const folderApi = {
  selectProjectFolder(): Promise<FolderSelectResult> {
    return ipcRenderer.invoke(IPC.folderSelect);
  },
} as const;

export type AgentGridFolderApi = typeof folderApi;

contextBridge.exposeInMainWorld('agentgridFolders', folderApi);

const appStateApi = {
  load(): Promise<PersistedAppState> {
    return ipcRenderer.invoke(IPC.appStateLoad);
  },
  save(state: PersistedAppState): Promise<PersistedAppState> {
    return ipcRenderer.invoke(IPC.appStateSave, { state });
  },
  patch(patch: AppStatePatch): Promise<PersistedAppState> {
    return ipcRenderer.invoke(IPC.appStatePatch, { patch });
  },
} as const;

export type AgentGridAppStateApi = typeof appStateApi;

contextBridge.exposeInMainWorld('agentgridAppState', appStateApi);

const browserApi = {
  create(req: BrowserPreviewCreateRequest): Promise<BrowserPreviewResult> {
    return ipcRenderer.invoke(IPC.browserPreviewCreate, req);
  },
  setBounds(req: BrowserPreviewSetBoundsRequest): Promise<BrowserPreviewResult> {
    return ipcRenderer.invoke(IPC.browserPreviewSetBounds, req);
  },
  loadUrl(workspaceId: string, url: string): Promise<BrowserPreviewResult> {
    const req: BrowserPreviewLoadUrlRequest = { workspaceId, url };
    return ipcRenderer.invoke(IPC.browserPreviewLoadUrl, req);
  },
  navigate(workspaceId: string, action: BrowserPreviewNavigateAction): Promise<BrowserPreviewResult> {
    return ipcRenderer.invoke(IPC.browserPreviewNavigate, { workspaceId, action });
  },
  openExternal(workspaceId: string): Promise<BrowserPreviewResult> {
    return ipcRenderer.invoke(IPC.browserPreviewOpenExternal, { workspaceId });
  },
  destroy(workspaceId: string): Promise<BrowserPreviewResult> {
    return ipcRenderer.invoke(IPC.browserPreviewDestroy, { workspaceId });
  },
  onState(listener: (evt: BrowserPreviewStateEvent) => void): () => void {
    const handler = (_event: IpcRendererEvent, payload: BrowserPreviewStateEvent) => listener(payload);
    ipcRenderer.on(IPC.browserPreviewState, handler);
    return () => ipcRenderer.removeListener(IPC.browserPreviewState, handler);
  },
} as const;

export type AgentGridBrowserApi = typeof browserApi;

contextBridge.exposeInMainWorld('agentgridBrowser', browserApi);

