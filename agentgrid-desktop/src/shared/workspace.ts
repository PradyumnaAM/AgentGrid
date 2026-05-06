export type PaneAssignment = 'shell' | 'codex' | 'claude' | 'gemini';

export type PaneLaunchContext = 'native' | 'wsl';

export type PaneStatus = 'idle' | 'starting' | 'running' | 'exited' | 'error' | 'restarting';

export interface PaneExitState {
  exitCode: number | null;
  signal: number | null;
  exitedAt: number;
  reason?: string;
}

export interface PaneLayoutMeta {
  index: number;
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
  isFocused: boolean;
}

export interface TerminalPaneState {
  id: string;
  assignment: PaneAssignment;
  /** Launch context captured at Launch Workspace time. Restart reuses this. */
  launchContext: PaneLaunchContext;
  cwd: string;
  status: PaneStatus;
  ptyId: string | null;
  processPid: number | null;
  title: string;
  shellLabel: string;
  createdAt: number;
  startedAt: number | null;
  lastActiveAt: number | null;
  exitState: PaneExitState | null;
  restartable: boolean;
  restartCount: number;
  layout: PaneLayoutMeta;
  cols: number;
  rows: number;
  errorMessage: string | null;
}

export interface WorkspaceSettings {
  paneCount: number;
  defaultAssignment: 'shell';
  defaultCwd: string;
  fontSize: number;
  fontFamily: string;
  copyOnSelect: boolean;
  pasteConfirmForLargeText: boolean;
}

export interface WorkspaceState {
  panes: TerminalPaneState[];
  focusedPaneId: string | null;
  settings: WorkspaceSettings;
}
