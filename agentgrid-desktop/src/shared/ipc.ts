// Channel names and payload types shared between main, preload, and renderer.
// Keep this file dependency-free so it can be imported from all three layers.

export const IPC = {
  ptySpawn: 'pty:spawn',
  ptyWrite: 'pty:write',
  ptyResize: 'pty:resize',
  ptyKill: 'pty:kill',
  ptyData: 'pty:data',
  ptyExit: 'pty:exit',
  cliDetect: 'cli:detect',
  cliDetectAll: 'cli:detect-all',
  cliInstallOpen: 'cli-install:open',
  cliInstallSession: 'cli-install:session',
  cliInstallMarkerRead: 'cli-install:marker-read',
  cliInstallFinished: 'cli-install:finished',
  cliInstallCompleted: 'cli-install:completed',
  folderSelect: 'folder:select',
  appStateLoad: 'app-state:load',
  appStateSave: 'app-state:save',
  appStatePatch: 'app-state:patch',
  browserPreviewCreate: 'browser-preview:create',
  browserPreviewSetBounds: 'browser-preview:set-bounds',
  browserPreviewLoadUrl: 'browser-preview:load-url',
  browserPreviewNavigate: 'browser-preview:navigate',
  browserPreviewOpenExternal: 'browser-preview:open-external',
  browserPreviewDestroy: 'browser-preview:destroy',
  browserPreviewState: 'browser-preview:state',
} as const;

import type { PaneAssignment } from './workspace';
import type { CliDetectionVia } from './cli';
export type {
  AppStatePatch,
  AppStatePatchRequest,
  AppStateSaveRequest,
  LauncherDefaults,
  PersistedAppState,
  RecentWorkspaceEntry,
  TerminalSettings,
  WorkspaceLaunchConfig,
} from './appState';

/**
 * Launch context for a pane. `native` runs the binary directly on the host;
 * `wsl` runs it inside the default WSL distro through wsl.exe. The value is
 * sourced from detection (CliDetectionResult.via) and NEVER accepted blindly
 * from the renderer — the main process revalidates against its own
 * detection cache before spawning.
 */
export type PtyLaunchContext = CliDetectionVia;

export interface PtySpawnRequest {
  paneId: string;
  cols: number;
  rows: number;
  /** Which CLI (or shell) to launch in this pane. */
  assignment: PaneAssignment;
  /** Preferred launch context. Main process validates against detection. */
  context?: PtyLaunchContext;
  /**
   * Optional cwd override. Reserved for future user settings; the main
   * process currently ignores non-absolute paths and picks a safe default.
   */
  cwd?: string;
  /**
   * Optional absolute path hint coming from detection. The main process
   * re-runs detection and uses its own cached path as the source of truth —
   * this is only passed along for logging/debugging consistency.
   */
  detectedPath?: string;
}

export interface PtySpawnResult {
  id: string;
  paneId: string;
  /** Human-friendly label surfaced in the pane chrome. */
  shell: string;
  /** Actual argv[0] launched (absolute path or "wsl.exe" for WSL launches). */
  command: string;
  cwd: string;
  pid: number;
  assignment: PaneAssignment;
  context: PtyLaunchContext;
}

export interface PtySpawnFailure {
  error: string;
}

export type PtySpawnResponse = PtySpawnResult | PtySpawnFailure | null;

export interface PtyWritePayload {
  id: string;
  data: string;
}

export interface PtyResizePayload {
  id: string;
  cols: number;
  rows: number;
}

export interface PtyKillPayload {
  id: string;
}

export interface PtyDataEvent {
  id: string;
  paneId: string;
  data: string;
}

export interface PtyExitEvent {
  id: string;
  paneId: string;
  exitCode: number;
  signal?: number;
}

export interface InstallMarkerCreateResult {
  token: string;
  path: string;
}

export interface CliInstallOpenRequest {
  kind: import('./cli').CliKind;
}

export interface CliInstallSession {
  id: string;
  kind: import('./cli').CliKind;
  label: string;
  command: string;
  markerPath: string;
  scriptPath?: string;
}

export interface CliInstallMarkerReadResult {
  exists: boolean;
  content?: string;
}

export interface CliInstallFinishedRequest {
  id: string;
  exitCode: number;
}

export interface CliInstallCompletedEvent {
  kind: import('./cli').CliKind;
  exitCode: number;
  detection?: import('./cli').CliDetectionResult;
}

export interface FolderSelectResult {
  canceled: boolean;
  path?: string;
}

export interface BrowserPreviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrowserPreviewCreateRequest {
  workspaceId: string;
  bounds: BrowserPreviewBounds;
  initialUrl?: string;
}

export interface BrowserPreviewSetBoundsRequest {
  workspaceId: string;
  bounds: BrowserPreviewBounds;
  visible: boolean;
}

export interface BrowserPreviewLoadUrlRequest {
  workspaceId: string;
  url: string;
}

export type BrowserPreviewNavigateAction = 'back' | 'forward' | 'reload' | 'stop';

export interface BrowserPreviewNavigateRequest {
  workspaceId: string;
  action: BrowserPreviewNavigateAction;
}

export interface BrowserPreviewWorkspaceRequest {
  workspaceId: string;
}

export interface BrowserPreviewStateEvent {
  workspaceId: string;
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  error?: string;
}

export interface BrowserPreviewResult {
  ok: boolean;
  error?: string;
  state?: BrowserPreviewStateEvent;
}
