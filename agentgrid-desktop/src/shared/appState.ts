import type { PaneAssignment, PaneLaunchContext, WorkspaceSettings } from './workspace';

export const APP_STATE_VERSION = 1;

export interface LauncherDefaults {
  selectedFolder: string | null;
  paneCount: WorkspaceSettings['paneCount'];
  bulkAssignment: PaneAssignment | null;
  assignments: PaneAssignment[];
}

export interface TerminalSettings {
  fontSize: number;
  fontFamily: string;
  copyOnSelect: boolean;
  pasteConfirmForLargeText: boolean;
}

export interface WorkspaceLaunchConfig {
  folder: string;
  paneCount: WorkspaceSettings['paneCount'];
  bulkAssignment: PaneAssignment | null;
  assignments: PaneAssignment[];
  launchContext?: PaneLaunchContext;
  launchedAt: number;
}

export interface WorkspacePreset {
  id: string;
  name: string;
  paneCount: WorkspaceSettings['paneCount'];
  assignments: PaneAssignment[];
  createdAt: number;
}

export interface RecentWorkspaceEntry {
  folder: string;
  name: string;
  lastLaunchedAt: number;
  paneCount: WorkspaceSettings['paneCount'];
  bulkAssignment: PaneAssignment | null;
  assignments: PaneAssignment[];
}

export interface PersistedAppState {
  version: typeof APP_STATE_VERSION;
  launcherDefaults: LauncherDefaults;
  terminalSettings: TerminalSettings;
  lastWorkspaceLaunch: WorkspaceLaunchConfig | null;
  recentWorkspaces: RecentWorkspaceEntry[];
  presets: WorkspacePreset[];
  updatedAt: number;
}

export interface AppStatePatch {
  launcherDefaults?: Partial<LauncherDefaults>;
  terminalSettings?: Partial<TerminalSettings>;
  lastWorkspaceLaunch?: WorkspaceLaunchConfig | null;
  recentWorkspaces?: RecentWorkspaceEntry[];
  presets?: WorkspacePreset[];
}

export interface AppStateSaveRequest {
  state: PersistedAppState;
}

export interface AppStatePatchRequest {
  patch: AppStatePatch;
}

export const DEFAULT_APP_STATE: PersistedAppState = {
  version: APP_STATE_VERSION,
  launcherDefaults: {
    selectedFolder: null,
    paneCount: 3,
    bulkAssignment: 'shell',
    assignments: ['codex', 'claude', 'gemini'],
  },
  terminalSettings: {
    fontSize: 14,
    fontFamily: 'Consolas, "Cascadia Mono", "Courier New", monospace',
    copyOnSelect: true,
    pasteConfirmForLargeText: true,
  },
  lastWorkspaceLaunch: null,
  recentWorkspaces: [],
  presets: [],
  updatedAt: 0,
};
