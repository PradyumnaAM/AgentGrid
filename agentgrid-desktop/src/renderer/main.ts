import { Terminal, type IDisposable, type ILink, type ILinkProvider } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebglAddon } from 'xterm-addon-webgl';
import 'xterm/css/xterm.css';
import { animate, type AnimationPlaybackControlsWithThen } from 'motion';

import type {
  PaneAssignment,
  PaneLaunchContext,
  PaneLayoutMeta,
  TerminalPaneState,
  WorkspaceSettings,
  WorkspaceState,
} from '../shared/workspace';
import type { CliDetectionResult, CliDetectionStatus, CliKind } from '../shared/cli';
import {
  DEFAULT_APP_STATE,
  type ApprovalSettings,
  type AppStatePatch,
  type PersistedAppState,
  type RecentWorkspaceEntry,
  type TerminalSettings,
  type WorkspaceLaunchConfig,
  type WorkspacePreset,
} from '../shared/appState';
import {
  buildAgentMondayRoutePlan,
  type AgentMondayRoute,
  type AgentMondayRoutePlan,
} from '../shared/assistant';
import type {
  ApprovalAction,
  ApprovalQueueItemStatus,
  ApprovalResolveMode,
  ApprovalResolvedEvent,
  BrowserPreviewBounds,
  BrowserPreviewStateEvent,
  TerminalApprovalRequestEvent,
} from '../shared/ipc';

// â”€â”€â”€ DOM lookup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const statusEl = document.getElementById('status') as HTMLSpanElement | null;
const headerProjectFolderEl = document.getElementById('header-project-folder') as HTMLElement | null;
const sidebarWorkspacesEl = document.getElementById('sidebar-workspaces-list') as HTMLElement | null;
const sidebarHomeBtnEl = document.getElementById('sidebar-home-btn') as HTMLButtonElement | null;
const tabViewsEl = document.getElementById('tab-views') as HTMLElement | null;
const workspaceMountEl = document.getElementById('workspace-mount') as HTMLElement | null;
const homePanelEl = document.getElementById('home-panel') as HTMLElement | null;
const paneCountEl = document.getElementById('pane-count') as HTMLElement | null;

// Home / launcher elements (single instance; the Home tab is unique)
const launcherEl = document.getElementById('launcher') as HTMLElement | null;
const launcherPaneCountEl = document.getElementById('launcher-pane-count') as HTMLElement | null;
const launcherBulkAgentEl = document.getElementById('launcher-bulk-agent') as HTMLElement | null;
const launcherAssignmentsEl = document.getElementById('launcher-assignments') as HTMLElement | null;
const projectFolderPanelEl = document.getElementById('project-folder-panel') as HTMLElement | null;
const projectFolderPathEl = document.getElementById('project-folder-path') as HTMLElement | null;
const projectFolderHintEl = document.getElementById('project-folder-hint') as HTMLElement | null;
const projectFolderBrowseEl = document.getElementById('project-folder-browse') as HTMLButtonElement | null;
const launchButtonEl = document.getElementById('launch-button') as HTMLButtonElement | null;
const cliHealthSummaryEl = document.getElementById('cli-health-summary') as HTMLElement | null;
const cliHealthListEl = document.getElementById('cli-health-list') as HTMLElement | null;
const launcherSystemStatusEl = document.getElementById('launcher-system-status') as HTMLElement | null;
const openWorkspacesEl = document.getElementById('open-workspaces') as HTMLElement | null;
const openWorkspacesListEl = document.getElementById('open-workspaces-list') as HTMLElement | null;
const recentWorkspacesEl = document.getElementById('recent-workspaces') as HTMLElement | null;
const recentWorkspacesListEl = document.getElementById('recent-workspaces-list') as HTMLElement | null;
const recentWorkspacesClearEl = document.getElementById('recent-workspaces-clear') as HTMLButtonElement | null;
const settingsButtonEl = document.getElementById('settings-button') as HTMLButtonElement | null;
const settingsPanelEl = document.getElementById('settings-panel') as HTMLElement | null;
const settingsCloseEl = document.getElementById('settings-close') as HTMLButtonElement | null;
const settingsFontSizeEl = document.getElementById('settings-font-size') as HTMLInputElement | null;
const settingsFontFamilyEl = document.getElementById('settings-font-family') as HTMLInputElement | null;
const settingsCopyOnSelectEl = document.getElementById('settings-copy-on-select') as HTMLInputElement | null;
const settingsPasteConfirmEl = document.getElementById('settings-paste-confirm') as HTMLInputElement | null;
const settingsDefaultFolderEl = document.getElementById('settings-default-folder') as HTMLElement | null;
const settingsCliPathsListEl = document.getElementById('settings-cli-paths-list') as HTMLElement | null;
const launchSummaryPanelEl = document.getElementById('launch-summary-panel') as HTMLElement | null;
const summaryWorkspaceEl = document.getElementById('summary-workspace') as HTMLElement | null;
const summaryTerminalCountEl = document.getElementById('summary-terminal-count') as HTMLElement | null;
const summaryUniversalAgentEl = document.getElementById('summary-universal-agent') as HTMLElement | null;
const summaryAgentsListEl = document.getElementById('summary-agents-list') as HTMLElement | null;
const summaryLaunchBtnEl = document.getElementById('summary-launch-btn') as HTMLButtonElement | null;
const sidebarPresetsBtnEl = document.getElementById('sidebar-presets-btn') as HTMLButtonElement | null;
const sidebarPresetsListEl = document.getElementById('sidebar-presets-list') as HTMLElement | null;
const presetNameDialogEl = document.getElementById('preset-name-dialog') as HTMLDialogElement | null;
const presetNameInputEl = document.getElementById('preset-name-input') as HTMLInputElement | null;
const presetNameCancelEl = document.getElementById('preset-name-cancel') as HTMLButtonElement | null;
const installInstructionsDialogEl = document.getElementById('install-instructions-dialog') as HTMLDialogElement | null;
const installInstructionsCloseEl = document.getElementById('install-instructions-close') as HTMLButtonElement | null;
const installNoticeBtnEl = document.getElementById('install-notice-view-btn') as HTMLButtonElement | null;
const sidebarInstallBtnEl = document.getElementById('sidebar-install-btn') as HTMLButtonElement | null;
const sidebarToggleBtnEl = document.getElementById('sidebar-toggle') as HTMLButtonElement | null;
const appSidebarEl = document.querySelector('.app-sidebar') as HTMLElement | null;

const wizardTileGridEl = document.getElementById('wizard-tile-grid') as HTMLElement | null;
const wizardTerminalsBadgeEl = document.getElementById('wizard-terminals-badge') as HTMLElement | null;
const wizardUniversalAgentEl = document.getElementById('wizard-universal-agent-wrap') as HTMLElement | null;
const wizardSavePresetBtnEl = document.getElementById('wizard-save-preset-btn') as HTMLButtonElement | null;
const headerLaunchBtnEl = document.getElementById('header-launch-btn') as HTMLButtonElement | null;
const setupPane1El = document.getElementById('wizard-pane-1') as HTMLElement | null;
const setupPane2El = document.getElementById('wizard-pane-2') as HTMLElement | null;
const setupNextBtnEl = document.getElementById('setup-next-btn') as HTMLButtonElement | null;
const setupBackBtnEl = document.getElementById('setup-back-btn') as HTMLButtonElement | null;
const setupLaunchBtnEl = document.getElementById('setup-launch-btn') as HTMLButtonElement | null;
const ssItem1El = document.getElementById('ss-item-1') as HTMLElement | null;
const ssItem2El = document.getElementById('ss-item-2') as HTMLElement | null;
const ssCircle1El = document.getElementById('ss-circle-1') as HTMLElement | null;
const ssLine1El = document.getElementById('ss-line-1') as HTMLElement | null;

const agentMondayPanelEl = document.getElementById('agent-monday-panel') as HTMLElement | null;
const agentMondayStateEl = document.getElementById('agent-monday-state') as HTMLElement | null;
const agentMondayTaskEl = document.getElementById('agent-monday-task') as HTMLTextAreaElement | null;
const agentMondayPlanButtonEl = document.getElementById('agent-monday-plan-button') as HTMLButtonElement | null;
const agentMondayLaunchButtonEl = document.getElementById('agent-monday-launch-button') as HTMLButtonElement | null;
const agentMondayRoutePreviewEl = document.getElementById('agent-monday-route-preview') as HTMLElement | null;
const agentMondayRouteStatusEl = document.getElementById('agent-monday-route-status') as HTMLElement | null;
const agentMondaySetupGuidanceEl = document.getElementById('agent-monday-setup-guidance') as HTMLElement | null;

if (!sidebarWorkspacesEl) throw new Error('sidebar-workspaces-list element missing');
if (!sidebarHomeBtnEl) throw new Error('sidebar-home-btn element missing');
if (!tabViewsEl) throw new Error('tab-views element missing');
if (!workspaceMountEl) throw new Error('workspace-mount element missing');
if (!homePanelEl) throw new Error('home-panel element missing');
// pane-count lives in the compat hidden div; null-safe throughout
if (!launcherEl) throw new Error('launcher element missing');
if (!launcherPaneCountEl) throw new Error('launcher-pane-count element missing');
if (!launcherBulkAgentEl) throw new Error('launcher-bulk-agent element missing');
if (!launcherAssignmentsEl) throw new Error('launcher-assignments element missing');
if (!projectFolderPanelEl) throw new Error('project-folder-panel element missing');
if (!projectFolderPathEl) throw new Error('project-folder-path element missing');
if (!projectFolderHintEl) throw new Error('project-folder-hint element missing');
if (!projectFolderBrowseEl) throw new Error('project-folder-browse element missing');
if (!cliHealthSummaryEl) throw new Error('cli-health-summary element missing');
if (!cliHealthListEl) throw new Error('cli-health-list element missing');
if (!settingsButtonEl) throw new Error('settings-button element missing');
if (!settingsPanelEl) throw new Error('settings-panel element missing');
if (!settingsCloseEl) throw new Error('settings-close element missing');
if (!settingsFontSizeEl) throw new Error('settings-font-size element missing');
if (!settingsFontFamilyEl) throw new Error('settings-font-family element missing');
if (!settingsCopyOnSelectEl) throw new Error('settings-copy-on-select element missing');
if (!settingsPasteConfirmEl) throw new Error('settings-paste-confirm element missing');
if (!settingsDefaultFolderEl) throw new Error('settings-default-folder element missing');
if (!settingsCliPathsListEl) throw new Error('settings-cli-paths-list element missing');

const mainAppEl = document.getElementById('main-app') as HTMLElement | null;

if (!mainAppEl) throw new Error('main-app element missing');

const ASSIGNMENT_LABELS: Record<PaneAssignment, string> = {
  shell: 'Empty Terminal',
  codex: 'Codex',
  claude: 'Claude Code',
  gemini: 'Gemini',
};

const ASSIGNMENT_DESCRIPTIONS: Record<PaneAssignment, string> = {
  shell: 'Blank shell terminal',
  codex: 'OpenAI coding agent CLI',
  claude: 'Anthropic coding CLI',
  gemini: 'Google Gemini CLI',
};

const ALL_ASSIGNMENTS: PaneAssignment[] = ['codex', 'claude', 'gemini', 'shell'];
const CLI_ASSIGNMENTS: PaneAssignment[] = ['codex', 'claude', 'gemini'];

// Auto-typed into the shell shortly after PTY connects (newline = Enter).
const CLI_AUTOCOMMAND: Record<PaneAssignment, string | null> = {
  shell: null,
  codex: 'codex',
  claude: 'claude',
  gemini: 'gemini',
};

const AUTOCOMMAND_DELAY_MS = 350;
const PANE_COUNT_MIN = 1;
const LAUNCHER_PANE_COUNT_MAX = 12;
const WORKSPACE_PANE_COUNT_MAX = 12;
const DEFAULT_TERMINAL_COLS = 80;
const DEFAULT_TERMINAL_ROWS = 24;
const TERMINAL_SCROLLBACK_LINES = 5000;
const BROWSER_DEFAULT_WIDTH = 520;
const BROWSER_MIN_WIDTH = 360;
const BROWSER_MAX_WIDTH = 720;
const TERMINAL_MIN_WIDTH_WITH_BROWSER = 320;
const BROWSER_PLACEHOLDER_URL = 'http://localhost:3000';
const AUTO_APPROVAL_DELAY_MS = 4000;

function resolveContextForAssignment(_assignment: PaneAssignment): PaneLaunchContext {
  return 'native';
}

function describeAssignmentForSelect(assignment: PaneAssignment): string {
  return ASSIGNMENT_LABELS[assignment];
}

function assignmentLaunchHint(assignment: PaneAssignment): string {
  const cmd = CLI_AUTOCOMMAND[assignment];
  return cmd ? `Auto-types '${cmd}' in shell` : 'Interactive shell';
}

function inferBulkAssignment(assignments: readonly PaneAssignment[]): PaneAssignment | null {
  const first = assignments[0];
  if (!first || !CLI_ASSIGNMENTS.includes(first)) return null;
  return assignments.every((assignment) => assignment === first) ? first : null;
}

function clampPaneCount(value: unknown, max: number): number {
  const count = Math.round(Number(value));
  if (!Number.isFinite(count)) return PANE_COUNT_MIN;
  return Math.min(max, Math.max(PANE_COUNT_MIN, count));
}

function cssToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function cssTokenNumber(name: string): number {
  return Number.parseFloat(cssToken(name));
}

const DEFAULT_FONT_FAMILY = cssToken('--font-family-code');
const DEFAULT_FONT_SIZE = cssTokenNumber('--font-size-13');
const TERMINAL_LINE_HEIGHT = cssTokenNumber('--line-height-ui');
const MOTION_Y_XS = cssTokenNumber('--space-4');
const MOTION_Y_SM = cssTokenNumber('--space-6');
const MOTION_Y_MD = cssTokenNumber('--space-8');
const MOTION_Y_ZERO = cssToken('--space-0');

function translateY(value: number | string): string {
  return `translateY(${value}px)`;
}

function translateYToken(value: string): string {
  return `translateY(${value})`;
}

// How long a single pane's PTY teardown is allowed to take before we move
// on. The main process is idempotent on double-kill, so a slow exit just
// means the OS finishes cleanup after we've already moved the UI on.
const PANE_DISPOSE_TIMEOUT_MS = 1500;

// â”€â”€â”€ Motion presets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Centralized so every transition has a consistent, premium feel and so
// motion can be tuned in one place if it ever feels too slow / too fast.

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
const PREMIUM_EASE = [0.25, 0.46, 0.45, 0.94] as const;
const CONDITIONAL_EASE = [0.25, 0.46, 0.45, 0.94] as const;
const ENTRANCE_DURATION_S = 0.7;
const CONDITIONAL_ENTER_DURATION_S = 0.3;
const CONDITIONAL_EXIT_DURATION_S = 0.2;
const HOVER_TRANSFORM = 'translateY(-7px) scale(1.018)';
const BUTTON_TAP_TRANSFORM = 'scale(0.97)';
const MOTION_REST_TRANSFORM = 'translateY(0px) scale(1)';
const FILTER_CLEAR = 'blur(0px)';
const ENTRANCE_BLUR = 'blur(12px)';
const CONDITIONAL_ENTER_BLUR = 'blur(8px)';
const CONDITIONAL_EXIT_BLUR = 'blur(4px)';
const MEDIA_ENTRANCE_BLUR = 'blur(10px)';

function fadeIn(el: HTMLElement, opts?: { y?: number; duration?: number; delay?: number }): AnimationPlaybackControlsWithThen {
  const y = opts?.y ?? MOTION_Y_SM;
  if (prefersReducedMotion()) {
    return animate(el, { opacity: [0, 1] }, { duration: opts?.duration ?? ENTRANCE_DURATION_S, delay: opts?.delay ?? 0, ease: PREMIUM_EASE });
  }
  return animate(
    el,
    {
      opacity: [0, 1],
      filter: [ENTRANCE_BLUR, FILTER_CLEAR],
      transform: [translateY(y), translateYToken(MOTION_Y_ZERO)],
    },
    { duration: opts?.duration ?? ENTRANCE_DURATION_S, delay: opts?.delay ?? 0, ease: PREMIUM_EASE },
  );
}

function fadeOut(el: HTMLElement, opts?: { y?: number; duration?: number }): AnimationPlaybackControlsWithThen {
  const y = opts?.y ?? -MOTION_Y_XS;
  if (prefersReducedMotion()) {
    return animate(el, { opacity: [1, 0] }, { duration: opts?.duration ?? CONDITIONAL_EXIT_DURATION_S, ease: EASE_IN_OUT });
  }
  return animate(
    el,
    {
      opacity: [1, 0],
      filter: [FILTER_CLEAR, CONDITIONAL_EXIT_BLUR],
      transform: [translateYToken(MOTION_Y_ZERO), translateY(y)],
    },
    { duration: opts?.duration ?? CONDITIONAL_EXIT_DURATION_S, ease: EASE_IN_OUT },
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function conditionalEnter(el: HTMLElement): AnimationPlaybackControlsWithThen {
  if (prefersReducedMotion()) {
    return animate(el, { opacity: [0, 1] }, { duration: CONDITIONAL_ENTER_DURATION_S, ease: CONDITIONAL_EASE });
  }
  return animate(
    el,
    {
      opacity: [0, 1],
      scale: [0.9, 1],
      filter: [CONDITIONAL_ENTER_BLUR, FILTER_CLEAR],
      transform: [translateY(MOTION_Y_XS), translateYToken(MOTION_Y_ZERO)],
    },
    { duration: CONDITIONAL_ENTER_DURATION_S, ease: CONDITIONAL_EASE },
  );
}

function mediaEnter(el: HTMLElement, opts?: { delay?: number }): AnimationPlaybackControlsWithThen {
  if (prefersReducedMotion()) {
    return animate(el, { opacity: [0, 1] }, { duration: 0.65, delay: opts?.delay ?? 0, ease: EASE_OUT });
  }
  return animate(
    el,
    {
      opacity: [0, 1],
      scale: [0.92, 1],
      filter: [MEDIA_ENTRANCE_BLUR, FILTER_CLEAR],
    },
    { duration: 0.65, delay: opts?.delay ?? 0, ease: [0.34, 1.56, 0.64, 1] },
  );
}

function enableButtonMotion(el: HTMLElement, icon?: Element | null): void {
  if (el.dataset.motionBound === 'true') return;
  el.dataset.motionBound = 'true';
  const reset = (): void => {
    void animate(el, { transform: 'none' }, { duration: 0.12, ease: EASE_OUT });
    if (icon) void animate(icon, { transform: translateYToken(MOTION_Y_ZERO) }, { duration: 0.18, ease: EASE_OUT });
  };
  el.addEventListener('pointerenter', () => {
    if (prefersReducedMotion()) return;
    void animate(el, { transform: 'none' }, { duration: 0.12, ease: EASE_OUT });
    if (icon) void animate(icon, { transform: translateYToken(MOTION_Y_ZERO) }, { duration: 0.12, ease: EASE_OUT });
  });
  el.addEventListener('pointerleave', reset);
  el.addEventListener('pointerdown', () => {
    if (prefersReducedMotion()) return;
    void animate(el, { transform: 'none' }, { duration: 0.08, ease: EASE_OUT });
  });
  el.addEventListener('pointerup', reset);
}

function enableCardMotion(el: HTMLElement, icon?: Element | null): void {
  if (el.dataset.motionBound === 'true') return;
  el.dataset.motionBound = 'true';
  el.addEventListener('pointerenter', () => {
    if (prefersReducedMotion()) return;
    void animate(el, { transform: HOVER_TRANSFORM }, { duration: 0.28, ease: EASE_OUT });
    if (icon) void animate(icon, { transform: 'translateY(-3px)' }, { duration: 0.18, delay: 0.15, ease: EASE_OUT });
  });
  el.addEventListener('pointerleave', () => {
    void animate(el, { transform: MOTION_REST_TRANSFORM }, { duration: 0.24, ease: EASE_OUT });
    if (icon) void animate(icon, { transform: translateYToken(MOTION_Y_ZERO) }, { duration: 0.18, ease: EASE_OUT });
  });
}

function bindStaticMotionControls(): void {
  document.querySelectorAll<HTMLElement>(
    '.project-folder-button, .primary-button, .secondary-button',
  ).forEach((el) => enableButtonMotion(el, el.querySelector('svg, .primary-button-label')));

}

function syncSidebarHomeState(isActive: boolean): void {
  sidebarHomeBtnEl.classList.toggle('active', isActive);
  sidebarHomeBtnEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
}

function startHomeBackgroundMotion(): void {
  if (prefersReducedMotion()) return;
  const grid = document.querySelector('.home-bg-grid');
  const orbitA = document.querySelector('.home-bg-orbit-a');
  const orbitB = document.querySelector('.home-bg-orbit-b');
  const pulseA = document.querySelector('.home-bg-pulse-a');
  const pulseB = document.querySelector('.home-bg-pulse-b');

  if (grid instanceof HTMLElement) {
    void animate(
      grid,
      { backgroundPosition: ['0px 0px', '32px 32px'] },
      { duration: 28, repeat: Infinity, ease: 'linear' },
    );
  }

  if (orbitA instanceof HTMLElement) {
    void animate(
      orbitA,
      { transform: ['translate3d(0, 0, 0) scale(1)', 'translate3d(-18px, 14px, 0) scale(1.04)'], opacity: [0.72, 0.48] },
      { duration: 12, repeat: Infinity, repeatType: 'mirror', ease: EASE_IN_OUT },
    );
  }

  if (orbitB instanceof HTMLElement) {
    void animate(
      orbitB,
      { transform: ['translate3d(0, 0, 0) scale(1)', 'translate3d(20px, -10px, 0) scale(0.96)'], opacity: [0.52, 0.28] },
      { duration: 14, repeat: Infinity, repeatType: 'mirror', ease: EASE_IN_OUT },
    );
  }

  if (pulseA instanceof HTMLElement) {
    void animate(
      pulseA,
      { transform: ['translate3d(0, 0, 0) scale(1)', 'translate3d(-28px, 22px, 0) scale(1.18)'], opacity: [0.28, 0.5] },
      { duration: 9, repeat: Infinity, repeatType: 'mirror', ease: EASE_IN_OUT },
    );
  }

  if (pulseB instanceof HTMLElement) {
    void animate(
      pulseB,
      { transform: ['translate3d(0, 0, 0) scale(1)', 'translate3d(24px, -18px, 0) scale(1.12)'], opacity: [0.22, 0.42] },
      { duration: 11, repeat: Infinity, repeatType: 'mirror', ease: EASE_IN_OUT },
    );
  }
}

// â”€â”€â”€ Workspace state primitives (carried over, lightly tightened) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function createDefaultSettings(overrides?: Partial<WorkspaceSettings>): WorkspaceSettings {
  return {
    paneCount: 1,
    defaultAssignment: 'shell',
    defaultCwd: '',
    fontSize: DEFAULT_FONT_SIZE,
    fontFamily: DEFAULT_FONT_FAMILY,
    copyOnSelect: false,
    pasteConfirmForLargeText: true,
    ...overrides,
  };
}

function createLayout(count: number): PaneLayoutMeta[] {
  const normalized = clampPaneCount(count, WORKSPACE_PANE_COUNT_MAX);
  if (normalized === 1) return [{ index: 0, row: 1, column: 1, rowSpan: 1, columnSpan: 1, isFocused: true }];
  if (normalized === 2) {
    return [
      { index: 0, row: 1, column: 1, rowSpan: 1, columnSpan: 1, isFocused: true },
      { index: 1, row: 1, column: 2, rowSpan: 1, columnSpan: 1, isFocused: false },
    ];
  }
  if (normalized === 3) {
    return [
      { index: 0, row: 1, column: 1, rowSpan: 2, columnSpan: 1, isFocused: true },
      { index: 1, row: 1, column: 2, rowSpan: 1, columnSpan: 1, isFocused: false },
      { index: 2, row: 2, column: 2, rowSpan: 1, columnSpan: 1, isFocused: false },
    ];
  }
  if (normalized === 4) {
    return Array.from({ length: 4 }, (_, index) => ({
      index,
      row: Math.floor(index / 2) + 1,
      column: (index % 2) + 1,
      rowSpan: 1,
      columnSpan: 1,
      isFocused: index === 0,
    }));
  }
  if (normalized === 5) {
    return [
      { index: 0, row: 1, column: 1, rowSpan: 1, columnSpan: 2, isFocused: true },
      { index: 1, row: 1, column: 3, rowSpan: 1, columnSpan: 2, isFocused: false },
      { index: 2, row: 1, column: 5, rowSpan: 1, columnSpan: 2, isFocused: false },
      { index: 3, row: 2, column: 1, rowSpan: 1, columnSpan: 3, isFocused: false },
      { index: 4, row: 2, column: 4, rowSpan: 1, columnSpan: 3, isFocused: false },
    ];
  }
  if (normalized === 6) return Array.from({ length: 6 }, (_, index) => ({
    index,
    row: Math.floor(index / 3) + 1,
    column: (index % 3) + 1,
    rowSpan: 1,
    columnSpan: 1,
    isFocused: index === 0,
  }));
  const columns = 3;
  return Array.from({ length: normalized }, (_, index) => ({
    index,
    row: Math.floor(index / columns) + 1,
    column: (index % columns) + 1,
    rowSpan: 1,
    columnSpan: 1,
    isFocused: index === 0,
  }));
}

function applyWorkspaceGrid(workspaceEl: HTMLElement, count: number): void {
  workspaceEl.style.gridAutoRows = '';
  workspaceEl.style.overflow = '';
  workspaceEl.style.alignContent = '';
  if (count === 1) {
    workspaceEl.style.gridTemplateColumns = 'minmax(0, 1fr)';
    workspaceEl.style.gridTemplateRows = 'minmax(0, 1fr)';
    return;
  }
  if (count === 2) {
    workspaceEl.style.gridTemplateColumns = 'repeat(2, minmax(360px, 1fr))';
    workspaceEl.style.gridTemplateRows = 'minmax(0, 1fr)';
    return;
  }
  if (count === 3 || count === 4) {
    workspaceEl.style.gridTemplateColumns = count === 3
      ? 'repeat(3, minmax(360px, 1fr))'
      : 'repeat(2, minmax(360px, 1fr))';
    workspaceEl.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
    return;
  }
  if (count === 5) {
    workspaceEl.style.gridTemplateColumns = 'repeat(3, minmax(360px, 1fr))';
    workspaceEl.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
    return;
  }
  workspaceEl.style.gridTemplateColumns = 'repeat(3, minmax(360px, 1fr))';
  workspaceEl.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
  if (count > 6) {
    const rows = Math.ceil(count / 3);
    workspaceEl.style.gridTemplateColumns = 'repeat(3, minmax(380px, 1fr))';
    workspaceEl.style.gridTemplateRows = `repeat(${rows}, minmax(320px, 1fr))`;
    workspaceEl.style.gridAutoRows = 'minmax(320px, 1fr)';
    workspaceEl.style.overflow = 'auto';
    workspaceEl.style.alignContent = 'start';
  }
}

function formatStatus(pane: TerminalPaneState): string {
  if (pane.status === 'running') {
    return 'Running';
  }
  if (pane.status === 'starting') return 'Starting...';
  if (pane.status === 'restarting') return 'Restarting...';
  if (pane.status === 'exited') {
    const code = pane.exitState?.exitCode;
    return code === 0 ? 'Exited' : 'Exited with error';
  }
  if (pane.status === 'error') return 'Launch failed';
  return 'Idle';
}

function formatPaneChromeLine(pane: TerminalPaneState): string {
  const tool = ASSIGNMENT_LABELS[pane.assignment] ?? pane.assignment;
  const terminalLabel = `Terminal ${pane.layout.index + 1}`;
  return `${terminalLabel} · ${tool}`;
}

function formatPaneStatusLabel(pane: TerminalPaneState): string {
  if (pane.status === 'running') return 'Running';
  if (pane.status === 'starting') return 'Starting';
  if (pane.status === 'restarting') return 'Restarting';
  if (pane.status === 'exited') return pane.exitState?.exitCode === 0 ? 'Exited' : 'Error';
  if (pane.status === 'error') return 'Error';
  return 'Idle';
}

function formatPaneTitleLine(pane: TerminalPaneState): string {
  const tool = ASSIGNMENT_LABELS[pane.assignment] ?? pane.assignment;
  return `Terminal ${pane.layout.index + 1} · ${tool}`;
}

function createPaneState(index: number, layout: PaneLayoutMeta): TerminalPaneState {
  const now = Date.now();
  return {
    id: `pane-${index + 1}`,
    assignment: 'shell',
    launchContext: 'native',
    cwd: '',
    status: 'idle',
    ptyId: null,
    processPid: null,
    title: ASSIGNMENT_LABELS.shell,
    shellLabel: 'shell',
    createdAt: now,
    startedAt: null,
    lastActiveAt: null,
    exitState: null,
    restartable: true,
    restartCount: 0,
    layout,
    cols: DEFAULT_TERMINAL_COLS,
    rows: DEFAULT_TERMINAL_ROWS,
    errorMessage: null,
  };
}

let globalPaneSeq = 1;

class WorkspaceStore {
  private state: WorkspaceState;
  private paneSeq = 0;

  constructor(settings = createDefaultSettings()) {
    const layout = createLayout(settings.paneCount);
    const panes = layout.map((meta, index) => ({
      ...createPaneState(index, meta),
      id: this.freshPaneId(),
    }));
    this.state = {
      settings,
      focusedPaneId: panes[0]?.id ?? null,
      panes,
    };
  }

  get snapshot(): WorkspaceState {
    return this.state;
  }

  private freshPaneId(): string {
    return `pane-${globalPaneSeq++}`;
  }

  setPaneCount(count: number): { removed: TerminalPaneState[]; added: TerminalPaneState[] } {
    const nextCount = clampPaneCount(count, WORKSPACE_PANE_COUNT_MAX);
    const oldPanes = this.state.panes;
    const layout = createLayout(nextCount);
    const nextPanes = layout.map((meta, index) => {
      const existing = oldPanes[index];
      if (existing)
        return {
          ...existing,
          layout: meta,
          title: ASSIGNMENT_LABELS[existing.assignment],
        };
      return {
        ...createPaneState(index, meta),
        cwd: this.state.settings.defaultCwd,
        id: this.freshPaneId(),
        title: ASSIGNMENT_LABELS.shell,
      };
    });
    const removed = oldPanes.slice(nextCount);
    const added = nextPanes.filter((pane) => !oldPanes.some((old) => old.id === pane.id));
    const focusedStillExists = nextPanes.some((pane) => pane.id === this.state.focusedPaneId);
    const focusedPaneId = focusedStillExists ? this.state.focusedPaneId : nextPanes[0]?.id ?? null;
    this.state = {
      ...this.state,
      focusedPaneId,
      settings: { ...this.state.settings, paneCount: nextCount },
      panes: nextPanes.map((pane) => ({
        ...pane,
        layout: { ...pane.layout, isFocused: pane.id === focusedPaneId },
      })),
    };
    return { removed, added };
  }

  /**
   * Remove a single pane and reflow the rest. Returns the removed state for
   * caller-side disposal, or null if the id is unknown.
   */
  removePane(id: string): TerminalPaneState | null {
    const idx = this.state.panes.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const removed = this.state.panes[idx];
    const remaining = this.state.panes.filter((p) => p.id !== id);

    if (remaining.length === 0) {
      this.state = {
        ...this.state,
        focusedPaneId: null,
        panes: [],
        settings: { ...this.state.settings, paneCount: 1 },
      };
      return removed;
    }

    const count = clampPaneCount(remaining.length, WORKSPACE_PANE_COUNT_MAX);
    const layout = createLayout(count);
    const repositioned = remaining.map((pane, i) => ({
      ...pane,
      title: ASSIGNMENT_LABELS[pane.assignment],
      layout: layout[i],
    }));
    const focusedStillExists = repositioned.some((p) => p.id === this.state.focusedPaneId);
    const focusedPaneId = focusedStillExists ? this.state.focusedPaneId : repositioned[0]?.id ?? null;
    this.state = {
      ...this.state,
      focusedPaneId,
      settings: { ...this.state.settings, paneCount: count },
      panes: repositioned.map((p) => ({
        ...p,
        layout: { ...p.layout, isFocused: p.id === focusedPaneId },
      })),
    };
    return removed;
  }

  focusPane(id: string): void {
    if (!this.state.panes.some((pane) => pane.id === id)) return;
    this.state = {
      ...this.state,
      focusedPaneId: id,
      panes: this.state.panes.map((pane) => ({
        ...pane,
        lastActiveAt: pane.id === id ? Date.now() : pane.lastActiveAt,
        layout: { ...pane.layout, isFocused: pane.id === id },
      })),
    };
  }

  updatePane(id: string, patch: Partial<TerminalPaneState>): void {
    this.state = {
      ...this.state,
      panes: this.state.panes.map((pane) => (pane.id === id ? { ...pane, ...patch } : pane)),
    };
  }
}

// â”€â”€â”€ Pane controller (kept stable; only chrome-callback indirection is new) â”€

interface TerminalPaneControllerCallbacks {
  onFocus: (id: string) => void;
  onRequestClose: (id: string) => void;
  onChromeChange: () => void;
  onOpenLink: (url: string) => void;
}

const TERMINAL_HTTP_URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
const TERMINAL_URL_TRAILING_PUNCTUATION_RE = /[.,;:!?)\]}]+$/;
const TERMINAL_FOCUS_REPORT_RE = /\x1b\[(?:I|O)/g;

function createHttpLinkProvider(term: Terminal, onOpen: (url: string) => void): ILinkProvider {
  return {
    provideLinks(bufferLineNumber, callback): void {
      const line = term.buffer.active.getLine(bufferLineNumber - 1);
      if (!line) {
        callback(undefined);
        return;
      }
      const text = line.translateToString(true);
      const links: ILink[] = [];
      TERMINAL_HTTP_URL_RE.lastIndex = 0;
      for (let match = TERMINAL_HTTP_URL_RE.exec(text); match; match = TERMINAL_HTTP_URL_RE.exec(text)) {
        const raw = match[0];
        const clean = raw.replace(TERMINAL_URL_TRAILING_PUNCTUATION_RE, '');
        if (!clean) continue;
        const startX = match.index + 1;
        const endX = match.index + clean.length;
        links.push({
          text: clean,
          range: {
            start: { x: startX, y: bufferLineNumber },
            end: { x: endX, y: bufferLineNumber },
          },
          decorations: {
            pointerCursor: true,
            underline: true,
          },
          activate: (_event, url) => onOpen(url),
        });
      }
      callback(links.length > 0 ? links : undefined);
    },
  };
}

class TerminalPaneController {
  readonly root: HTMLElement;
  private readonly terminalHost: HTMLElement;
  private readonly chromeLineEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly killButton: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly term: Terminal;
  private readonly fitAddon: FitAddon;
  private readonly resizeObserver: ResizeObserver;
  private ptyId: string | null = null;
  private exited = false;
  private resizeFrame = 0;
  private dataOff: (() => void) | null = null;
  private exitOff: (() => void) | null = null;
  private linkProviderDisposable: IDisposable | null = null;
  private disposePromise: Promise<void> | null = null;
  private pendingPick = false;
  private pickerEl: HTMLElement | null = null;
  private errorBannerEl: HTMLElement | null = null;

  constructor(
    private pane: TerminalPaneState,
    private readonly store: WorkspaceStore,
    private readonly callbacks: TerminalPaneControllerCallbacks,
  ) {
    this.root = document.createElement('section');
    this.root.className = 'terminal-pane';
    this.root.dataset.paneId = pane.id;

    const inner = document.createElement('div');
    inner.className = 'pane-inner';

    const toolbar = document.createElement('div');
    toolbar.className = 'pane-toolbar';

    this.chromeLineEl = document.createElement('div');
    this.chromeLineEl.className = 'pane-chrome-line';
    this.chromeLineEl.textContent = formatPaneChromeLine(pane);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'pane-status';

    this.restartButton = document.createElement('button');
    this.restartButton.type = 'button';
    this.restartButton.className = 'pane-action';
    this.restartButton.textContent = '↻';
    this.restartButton.title = 'Restart';
    this.restartButton.setAttribute('aria-label', 'Restart terminal');
    enableButtonMotion(this.restartButton);
    this.restartButton.addEventListener('click', (event) => {
      event.stopPropagation();
      void this.restart();
    });

    this.killButton = document.createElement('button');
    this.killButton.type = 'button';
    this.killButton.className = 'pane-action';
    this.killButton.textContent = '■';
    this.killButton.title = 'Kill';
    this.killButton.setAttribute('aria-label', 'Kill terminal');
    enableButtonMotion(this.killButton);
    this.killButton.addEventListener('click', (event) => {
      event.stopPropagation();
      void this.kill();
    });

    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.className = 'pane-action pane-close';
    this.closeButton.textContent = '\u00D7';
    this.closeButton.title = 'Close terminal';
    this.closeButton.setAttribute('aria-label', 'Close terminal');
    enableButtonMotion(this.closeButton);
    this.closeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.callbacks.onRequestClose(this.pane.id);
    });

    toolbar.append(
      this.chromeLineEl,
      this.statusEl,
      this.restartButton,
      this.killButton,
      this.closeButton,
    );

    this.terminalHost = document.createElement('div');
    this.terminalHost.className = 'terminal-host';

    inner.append(toolbar, this.terminalHost);
    this.root.append(inner);

    this.term = new Terminal({
      cursorBlink: true,
      fontFamily: store.snapshot.settings.fontFamily,
      fontSize: store.snapshot.settings.fontSize,
      lineHeight: TERMINAL_LINE_HEIGHT,
      theme: {
        background: cssToken('--color-terminal-bg'),
        foreground: cssToken('--color-terminal-fg'),
        cursor: cssToken('--color-terminal-cursor'),
        selectionBackground: cssToken('--color-selection'),
      },
      allowProposedApi: true,
      scrollback: TERMINAL_SCROLLBACK_LINES,
      customKeyEventHandler: (event) => this.handleTerminalKey(event),
      linkHandler: {
        activate: (_event, text) => this.openTerminalLink(text),
        allowNonHttpProtocols: false,
      },
    });

    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(this.terminalHost);
    this.linkProviderDisposable = this.term.registerLinkProvider(
      createHttpLinkProvider(this.term, (url) => this.openTerminalLink(url)),
    );

    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      this.term.loadAddon(webgl);
    } catch {
      // Canvas renderer remains available when WebGL is not.
    }

    this.term.onData((data) => {
      if (!this.ptyId || this.exited) return;
      const safeData = this.stripTerminalFocusReports(data);
      if (!safeData) return;
      if (this.store.snapshot.settings.pasteConfirmForLargeText && safeData.length > 1000) {
        const ok = window.confirm(`Paste ${safeData.length} characters into this pane?`);
        if (!ok) return;
      }
      void window.agentgridPty.write(this.ptyId, safeData);
    });

    this.term.onSelectionChange(() => {
      if (!this.store.snapshot.settings.copyOnSelect || !this.term.hasSelection()) return;
      this.copySelection();
    });

    this.terminalHost.addEventListener('pointerdown', () => {
      this.focus();
    });

    this.terminalHost.addEventListener('focusin', () => {
      this.focus();
    });

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(this.terminalHost);
    window.addEventListener('resize', this.scheduleResize);

    this.update(this.pane);
  }

  mount(parent: HTMLElement): void {
    parent.append(this.root);
    // Tasteful entry animation â€” only the pane card, not its xterm canvas
    // (which gets its own opacity treatment via CSS to avoid flicker).
    void fadeIn(this.root, { y: MOTION_Y_MD, duration: ENTRANCE_DURATION_S });
    this.scheduleResize();
    if (this.pendingPick) {
      this.renderPicker();
      return;
    }
    void this.spawn();
  }

  /** Defer spawn until the user picks an assignment. */
  requirePick(): void {
    this.pendingPick = true;
  }

  private renderPicker(): void {
    if (this.pickerEl) return;
    this.store.updatePane(this.pane.id, { status: 'idle' });
    this.refreshChrome();

    const overlay = document.createElement('div');
    overlay.className = 'pane-picker';

    const title = document.createElement('div');
    title.className = 'pane-picker-title';
    title.textContent = `Ready to launch`;
    overlay.append(title);

    const helper = document.createElement('div');
    helper.className = 'pane-picker-helper';
    helper.textContent = 'Choose a CLI or open a blank shell.';
    overlay.append(helper);

    const selectRow = document.createElement('div');
    selectRow.className = 'pane-picker-row';
    const select = document.createElement('select');
    select.className = 'pane-picker-select';
    for (const kind of ALL_ASSIGNMENTS) {
      const opt = document.createElement('option');
      opt.value = kind;
      opt.textContent = describeAssignmentForSelect(kind);
      if (kind === this.pane.assignment) opt.selected = true;
      select.append(opt);
    }
    selectRow.append(select);

    const launchBtn = document.createElement('button');
    launchBtn.type = 'button';
    launchBtn.className = 'pane-picker-launch';
    launchBtn.textContent = 'Launch';
    launchBtn.setAttribute('aria-label', 'Launch selected terminal agent');
    launchBtn.addEventListener('click', () => {
      const choice = select.value as PaneAssignment;
      const context = resolveContextForAssignment(choice);
      this.store.updatePane(this.pane.id, {
        assignment: choice,
        launchContext: context,
        title: ASSIGNMENT_LABELS[choice],
      });
      this.pane = {
        ...this.pane,
        assignment: choice,
        launchContext: context,
        title: ASSIGNMENT_LABELS[choice],
      };
      this.pendingPick = false;
      const exiting = this.pickerEl;
      this.pickerEl = null;
      if (exiting) {
        void fadeOut(exiting, { duration: 0.16 }).then(() => exiting.remove());
      }
      void this.spawn();
    });
    selectRow.append(launchBtn);
    overlay.append(selectRow);

    this.root.append(overlay);
    this.pickerEl = overlay;
    enableCardMotion(overlay);
    enableButtonMotion(launchBtn);
    window.setTimeout(() => {
      if (this.pickerEl === overlay) select.focus();
    }, 0);
    void conditionalEnter(overlay);
  }

  update(pane: TerminalPaneState): void {
    this.pane = pane;
    const layout = pane.layout;
    this.root.style.gridRow = `${layout.row} / span ${layout.rowSpan}`;
    this.root.style.gridColumn = `${layout.column} / span ${layout.columnSpan}`;
    this.root.classList.toggle('focused', layout.isFocused);
    this.statusEl.textContent = formatPaneStatusLabel(pane);
    this.statusEl.className = `pane-status ${pane.status}`;
    this.statusEl.title = pane.errorMessage ?? '';
    this.chromeLineEl.textContent = formatPaneTitleLine(pane);
    this.chromeLineEl.title = pane.cwd
      ? `${ASSIGNMENT_LABELS[pane.assignment]} / ${workspaceName(pane.cwd)}`
      : ASSIGNMENT_LABELS[pane.assignment];
    this.renderErrorBanner(pane);
    this.restartButton.disabled =
      !pane.restartable || pane.status === 'starting' || pane.status === 'restarting';
    this.killButton.disabled = pane.status !== 'running';
  }

  /**
   * Re-read this pane's slot from the store and re-render its chrome, then
   * notify the owning workspace tab so the global header can update too.
   */
  private refreshChrome(): void {
    const next = this.store.snapshot.panes.find((p) => p.id === this.pane.id);
    if (next) this.update(next);
    this.callbacks.onChromeChange();
  }

  private renderErrorBanner(pane: TerminalPaneState): void {
    if (pane.status === 'error' && pane.errorMessage) {
      if (!this.errorBannerEl) {
        this.errorBannerEl = document.createElement('div');
        this.errorBannerEl.className = 'pane-error-banner';
        const inner = this.root.querySelector('.pane-inner');
        const toolbar = inner?.querySelector('.pane-toolbar');
        if (inner && toolbar) {
          toolbar.insertAdjacentElement('afterend', this.errorBannerEl);
        } else {
          this.root.prepend(this.errorBannerEl);
        }
      }
      this.errorBannerEl.textContent = pane.errorMessage;
    } else if (this.errorBannerEl) {
      this.errorBannerEl.remove();
      this.errorBannerEl = null;
    }
  }

  focus(): void {
    this.callbacks.onFocus(this.pane.id);
    this.term.focus();
  }

  private copySelection(): boolean {
    if (!this.term.hasSelection()) return false;
    const selection = this.term.getSelection();
    if (!selection) return false;
    window.agentgridPty.copyText(selection);
    return true;
  }

  private handleTerminalKey(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    const isCopyShortcut = (event.ctrlKey || event.metaKey) && key === 'c';
    if (!isCopyShortcut || !this.term.hasSelection()) return true;
    if (event.type === 'keydown') this.copySelection();
    return false;
  }

  private openTerminalLink(url: string): void {
    this.callbacks.onOpenLink(url);
  }

  private stripTerminalFocusReports(data: string): string {
    TERMINAL_FOCUS_REPORT_RE.lastIndex = 0;
    if (!TERMINAL_FOCUS_REPORT_RE.test(data)) return data;
    this.disableFocusReportingMode();
    TERMINAL_FOCUS_REPORT_RE.lastIndex = 0;
    return data.replace(TERMINAL_FOCUS_REPORT_RE, '');
  }

  private disableFocusReportingMode(): void {
    try {
      this.term.write('\x1b[?1004l');
    } catch {
      // Best-effort cleanup for CLIs that leave focus reporting enabled.
    }
  }

  async spawn(restarting = false): Promise<void> {
    const launchBlocker = cliLaunchBlocker(this.pane.assignment);
    if (launchBlocker) {
      this.store.updatePane(this.pane.id, {
        status: 'error',
        errorMessage: launchBlocker,
      });
      this.refreshChrome();
      return;
    }

    const sized = this.safeFit() ?? { cols: this.pane.cols, rows: this.pane.rows };
    this.exited = false;
    this.store.updatePane(this.pane.id, {
      status: restarting ? 'restarting' : 'starting',
      errorMessage: null,
      exitState: null,
      cols: sized.cols,
      rows: sized.rows,
    });
    this.refreshChrome();

    // Every pane is spawned as a plain interactive shell. The CLI command
    // (if any) is then auto-typed into that shell â€” so detection failures
    // surface as the shell's own "command not found" message rather than
    // leaking through the app's UI.
    const spawned = await window.agentgridPty.spawn({
      paneId: this.pane.id,
      cols: sized.cols,
      rows: sized.rows,
      assignment: this.pane.assignment,
      context: this.pane.launchContext,
      cwd: this.pane.cwd || undefined,
    });
    if (!spawned || 'error' in spawned) {
      this.store.updatePane(this.pane.id, {
        status: 'error',
        errorMessage: spawned && 'error' in spawned
          ? spawned.error
          : `Could not start the terminal. Use Restart to try again.`,
      });
      this.refreshChrome();
      return;
    }

    this.ptyId = spawned.id;
    this.dataOff?.();
    this.exitOff?.();
    this.dataOff = window.agentgridPty.onData((evt) => {
      if (evt.paneId !== this.pane.id || evt.id !== this.ptyId) return;
      this.term.write(evt.data);
    });
    this.exitOff = window.agentgridPty.onExit((evt) => {
      if (evt.paneId !== this.pane.id || evt.id !== this.ptyId) return;
      this.exited = true;
      this.store.updatePane(this.pane.id, {
        status: 'exited',
        ptyId: null,
        processPid: null,
        exitState: {
          exitCode: evt.exitCode,
          signal: evt.signal ?? null,
          exitedAt: Date.now(),
        },
      });
      this.refreshChrome();
    });

    this.store.updatePane(this.pane.id, {
      status: 'running',
      ptyId: spawned.id,
      processPid: spawned.pid,
      shellLabel: spawned.shell,
      cwd: spawned.cwd,
      startedAt: Date.now(),
      exitState: null,
      cols: sized.cols,
      rows: sized.rows,
    });
    this.refreshChrome();
    this.scheduleResize();
    this.focus();

    const autoCmd = CLI_AUTOCOMMAND[this.pane.assignment];
    if (autoCmd) {
      setTimeout(() => {
        if (this.ptyId && !this.exited) {
          void window.agentgridPty.write(this.ptyId, `${autoCmd}\r`);
        }
      }, AUTOCOMMAND_DELAY_MS);
    }
  }

  async restart(): Promise<void> {
    const pane = this.store.snapshot.panes.find((item) => item.id === this.pane.id);
    if (!pane) return;
    this.store.updatePane(this.pane.id, { restartCount: pane.restartCount + 1 });
    const oldPtyId = this.ptyId;
    if (oldPtyId && !this.exited) {
      this.ptyId = null;
      await window.agentgridPty.kill(oldPtyId);
    }
    this.term.clear();
    await this.spawn(true);
  }

  async kill(): Promise<void> {
    if (!this.ptyId || this.exited) return;
    await window.agentgridPty.kill(this.ptyId);
  }

  writeText(data: string): boolean {
    if (!this.ptyId || this.exited) return false;
    void window.agentgridPty.write(this.ptyId, data);
    return true;
  }

  /**
   * Real teardown: kill PTY, await its exit (or the timeout), detach
   * listeners, dispose xterm, remove from DOM. Idempotent.
   */
  dispose(): Promise<void> {
    if (this.disposePromise) return this.disposePromise;

    let settleDispose: () => void = () => {};
    this.disposePromise = new Promise<void>((resolve) => {
      settleDispose = resolve;
    });

    const hadLivePty = this.ptyId !== null && !this.exited;
    let exitResolver: () => void = () => {};
    const exitLatch: Promise<void> = hadLivePty
      ? new Promise<void>((resolve) => {
          exitResolver = resolve;
        })
      : Promise.resolve();

    try {
      this.resizeObserver.disconnect();
    } catch (err) {
      console.warn('[pane.dispose] resizeObserver.disconnect threw', err);
    }
    try {
      window.removeEventListener('resize', this.scheduleResize);
    } catch (err) {
      console.warn('[pane.dispose] resize listener remove threw', err);
    }

    if (hadLivePty) {
      const ptyIdSnapshot = this.ptyId;
      try {
        const off = window.agentgridPty.onExit((evt) => {
          if (evt.id !== ptyIdSnapshot) return;
          off();
          exitResolver();
        });
        void window.agentgridPty.kill(ptyIdSnapshot!);
      } catch (err) {
        console.warn('[pane.dispose] kill/onExit wiring threw', err);
        exitResolver();
      }
    }

    try {
      this.dataOff?.();
    } catch {
      // IPC unsubscribe occasionally throws if the channel was already gone.
    }
    try {
      this.exitOff?.();
    } catch {
      // Same as above.
    }
    try {
      this.linkProviderDisposable?.dispose();
    } catch {
      // Link provider can already be gone if xterm disposed first.
    }
    try {
      this.term.dispose();
    } catch (err) {
      console.warn('[pane.dispose] term.dispose threw', err);
    }
    try {
      this.root.remove();
    } catch (err) {
      console.warn('[pane.dispose] root.remove threw', err);
    }

    void Promise.race([
      exitLatch,
      new Promise<void>((resolve) => setTimeout(resolve, PANE_DISPOSE_TIMEOUT_MS)),
    ]).then(
      () => settleDispose(),
      () => settleDispose(),
    );

    return this.disposePromise;
  }

  /** Shutdown-only path: detach renderer resources without a `pty:kill` IPC. */
  disposeForShutdown(): void {
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.scheduleResize);
    this.dataOff?.();
    this.exitOff?.();
    this.linkProviderDisposable?.dispose();
    this.term.dispose();
    this.root.remove();
  }

  private readonly scheduleResize = (): void => {
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0;
      if (!this.ptyId || this.exited) return;
      const sized = this.safeFit();
      if (!sized) return;
      this.store.updatePane(this.pane.id, { cols: sized.cols, rows: sized.rows });
      void window.agentgridPty.resize(this.ptyId, sized.cols, sized.rows);
    });
  };

  requestResize(): void {
    this.scheduleResize();
  }

  private safeFit(): { cols: number; rows: number } | null {
    try {
      this.fitAddon.fit();
    } catch {
      // Element can be hidden or zero-sized while layouts are switching.
    }
    const cols = this.term.cols;
    const rows = this.term.rows;
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) {
      return null;
    }
    return { cols, rows };
  }
}

// â”€â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface BrowserShellElements {
  splitEl: HTMLElement;
  shellEl: HTMLElement;
  topBarEl: HTMLElement;
  topBarTitleEl: HTMLElement;
  topBarFolderEl: HTMLElement;
  topBarCountsEl: HTMLElement;
  topBarNewTerminalEl: HTMLButtonElement;
  topBarSavePresetEl: HTMLButtonElement;
  topBarApprovalsEl: HTMLButtonElement;
  topBarSettingsEl: HTMLButtonElement;
  topBarBackEl: HTMLButtonElement;
  railEl: HTMLElement;
  railButtons: Record<'workspace' | 'agents' | 'logs' | 'approvals' | 'files' | 'settings', HTMLButtonElement>;
  approvalPanelEl: HTMLElement;
  approvalCountEl: HTMLElement;
  approvalListEl: HTMLElement;
  approvalFooterEl: HTMLElement;
  statusBarEl: HTMLElement;
  statusFolderEl: HTMLElement;
  statusTerminalCountEl: HTMLElement;
  statusRunningCountEl: HTMLElement;
  statusAgentEl: HTMLElement;
  statusAutoApproveEl: HTMLElement;
  statusHealthEl: HTMLElement;
  workspaceEl: HTMLElement;
  splitterEl: HTMLElement;
  panelEl: HTMLElement;
  viewportEl: HTMLElement;
  urlInput: HTMLInputElement;
  statusEl: HTMLElement;
  backButton: HTMLButtonElement;
  forwardButton: HTMLButtonElement;
  reloadButton: HTMLButtonElement;
  externalButton: HTMLButtonElement;
  collapseButton: HTMLButtonElement;
}

class WorkspaceBrowserController {
  private isOpen = false;
  private isActive = false;
  private isCreated = false;
  private isSuppressed = false;
  private browserWidth = BROWSER_DEFAULT_WIDTH;
  private boundsFrame = 0;
  private resizeObserver: ResizeObserver;
  private offState: (() => void) | null = null;
  private latestUrl = '';
  private isLoading = false;

  constructor(
    private readonly workspaceId: string,
    private readonly elements: BrowserShellElements,
    private readonly onLayoutChange: () => void,
  ) {
    this.elements.urlInput.placeholder = BROWSER_PLACEHOLDER_URL;
    this.elements.splitEl.style.setProperty('--browser-width', `${this.browserWidth}px`);
    this.elements.backButton.disabled = true;
    this.elements.forwardButton.disabled = true;
    this.elements.externalButton.disabled = true;
    this.resizeObserver = new ResizeObserver(() => this.scheduleBounds());
    this.resizeObserver.observe(this.elements.viewportEl);
    window.addEventListener('resize', this.scheduleBounds);
    this.offState = window.agentgridBrowser?.onState((state) => {
      if (state.workspaceId !== this.workspaceId) return;
      this.applyState(state);
    }) ?? null;
    this.bindControls();
    this.renderCollapsed();
  }

  openUrl(url: string): void {
    this.isOpen = true;
    this.renderCollapsed();
    void this.ensureCreated().then(() => {
      this.scheduleBounds();
      void this.loadUrl(url);
    });
    this.onLayoutChange();
  }

  collapse(): void {
    this.isOpen = false;
    this.renderCollapsed();
    this.sendVisible(false);
    this.onLayoutChange();
  }

  setActive(active: boolean): void {
    this.isActive = active;
    this.scheduleBounds();
  }

  setSuppressed(suppressed: boolean): void {
    this.isSuppressed = suppressed;
    this.scheduleBounds();
  }

  destroy(): void {
    if (this.boundsFrame) cancelAnimationFrame(this.boundsFrame);
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.scheduleBounds);
    this.offState?.();
    if (this.isCreated) {
      void window.agentgridBrowser?.destroy(this.workspaceId);
    }
    this.isCreated = false;
  }

  private bindControls(): void {
    this.elements.collapseButton.addEventListener('click', () => this.collapse());
    this.elements.backButton.addEventListener('click', () => this.navigate('back'));
    this.elements.forwardButton.addEventListener('click', () => this.navigate('forward'));
    this.elements.reloadButton.addEventListener('click', () => this.navigate(this.isLoading ? 'stop' : 'reload'));
    this.elements.externalButton.addEventListener('click', () => {
      void window.agentgridBrowser?.openExternal(this.workspaceId).then((res) => {
        if (!res.ok) this.showError(res.error ?? 'Could not open URL externally');
      });
    });

    const form = this.elements.urlInput.form;
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const normalized = normalizeBrowserInput(this.elements.urlInput.value || BROWSER_PLACEHOLDER_URL);
      this.elements.urlInput.value = normalized;
      void this.loadUrl(normalized);
    });

    this.elements.splitterEl.addEventListener('pointerdown', (event) => {
      if (!this.isOpen) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = this.browserWidth;
      const pointerId = event.pointerId;
      this.elements.splitterEl.setPointerCapture(pointerId);
      const onMove = (move: PointerEvent): void => {
        this.setBrowserWidth(startWidth + startX - move.clientX);
      };
      const onUp = (): void => {
        this.elements.splitterEl.releasePointerCapture(pointerId);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  private async ensureCreated(): Promise<void> {
    if (this.isCreated) return;
    if (!window.agentgridBrowser) {
      this.showError('Browser preview bridge unavailable');
      return;
    }
    const res = await window.agentgridBrowser.create({
      workspaceId: this.workspaceId,
      bounds: this.currentBounds(),
    });
    if (!res.ok) {
      this.showError(res.error ?? 'Browser preview unavailable');
      return;
    }
    this.isCreated = true;
    if (res.state) this.applyState(res.state);
  }

  private async loadUrl(url: string): Promise<void> {
    await this.ensureCreated();
    if (!window.agentgridBrowser || !this.isCreated) return;
    const res = await window.agentgridBrowser.loadUrl(this.workspaceId, url);
    if (!res.ok) {
      this.showError(res.error ?? 'Could not load URL');
      return;
    }
    if (res.state) this.applyState(res.state);
    this.scheduleBounds();
  }

  private navigate(action: 'back' | 'forward' | 'reload' | 'stop'): void {
    if (!window.agentgridBrowser || !this.isCreated) return;
    void window.agentgridBrowser.navigate(this.workspaceId, action).then((res) => {
      if (!res.ok) this.showError(res.error ?? 'Browser navigation failed');
      else if (res.state) this.applyState(res.state);
    });
  }

  private setBrowserWidth(width: number): void {
    const splitWidth = this.elements.splitEl.getBoundingClientRect().width;
    const maxByLayout = Math.max(BROWSER_MIN_WIDTH, splitWidth - TERMINAL_MIN_WIDTH_WITH_BROWSER);
    this.browserWidth = Math.min(BROWSER_MAX_WIDTH, Math.min(maxByLayout, Math.max(BROWSER_MIN_WIDTH, width)));
    this.elements.splitEl.style.setProperty('--browser-width', `${this.browserWidth}px`);
    this.scheduleBounds();
    this.onLayoutChange();
  }

  private scheduleBounds = (): void => {
    if (this.boundsFrame) cancelAnimationFrame(this.boundsFrame);
    this.boundsFrame = requestAnimationFrame(() => {
      this.boundsFrame = 0;
      const visible = this.isOpen && this.isActive && !this.isSuppressed;
      this.sendVisible(visible);
    });
  };

  private sendVisible(visible: boolean): void {
    if (!window.agentgridBrowser || !this.isCreated) return;
    void window.agentgridBrowser.setBounds({
      workspaceId: this.workspaceId,
      bounds: visible ? this.currentBounds() : { x: 0, y: 0, width: 0, height: 0 },
      visible,
    });
  }

  private currentBounds(): BrowserPreviewBounds {
    const rect = this.elements.viewportEl.getBoundingClientRect();
    return {
      x: Math.max(0, Math.round(rect.x)),
      y: Math.max(0, Math.round(rect.y)),
      width: Math.max(0, Math.round(rect.width)),
      height: Math.max(0, Math.round(rect.height)),
    };
  }

  private applyState(state: BrowserPreviewStateEvent): void {
    this.latestUrl = state.url || this.latestUrl;
    this.isLoading = state.loading;
    if (state.url) this.elements.urlInput.value = state.url;
    this.elements.statusEl.textContent = state.error
      ? state.error
      : state.loading
        ? 'Loading'
        : state.title || state.url || 'Ready';
    this.elements.backButton.disabled = !state.canGoBack;
    this.elements.forwardButton.disabled = !state.canGoForward;
    this.elements.reloadButton.textContent = state.loading ? 'Stop' : 'Reload';
    this.elements.externalButton.disabled = !(state.url || this.latestUrl);
  }

  private showError(message: string): void {
    this.elements.statusEl.textContent = message;
  }

  private renderCollapsed(): void {
    this.elements.splitEl.classList.toggle('is-browser-collapsed', !this.isOpen);
    this.elements.panelEl.setAttribute('aria-hidden', this.isOpen ? 'false' : 'true');
  }
}

function normalizeBrowserInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return BROWSER_PLACEHOLDER_URL;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return trimmed;
  const host = trimmed.split(/[/?#]/, 1)[0]?.toLowerCase() ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.') || host === '[::1]' || host.startsWith('[::1]:')) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

type TabKind = 'home' | 'workspace';

interface TabBase {
  id: string;
  kind: TabKind;
  title: string;
  panelEl: HTMLElement;
  tabButtonEl: HTMLButtonElement | null;
}

interface HomeTab extends TabBase {
  kind: 'home';
}

function createBrowserShell(workspaceId: string): BrowserShellElements {
  const splitEl = document.createElement('div');
  splitEl.className = 'workspace-split is-browser-collapsed';

  const shellEl = document.createElement('div');
  shellEl.className = 'workspace-shell';

  const topBarEl = document.createElement('header');
  topBarEl.className = 'workspace-topbar';

  const topBarBrand = document.createElement('div');
  topBarBrand.className = 'workspace-topbar-brand';
  const topBarLogo = document.createElement('img');
  topBarLogo.src = './logo.png';
  topBarLogo.alt = '';
  topBarLogo.setAttribute('aria-hidden', 'true');
  topBarLogo.width = 28;
  topBarLogo.height = 28;
  topBarBrand.append(topBarLogo);

  const topBarBrandText = document.createElement('div');
  topBarBrandText.className = 'workspace-topbar-brand-text';
  const topBarBrandName = document.createElement('div');
  topBarBrandName.className = 'workspace-topbar-brand-name';
  topBarBrandName.textContent = 'AgentGrid';
  const topBarBrandCaption = document.createElement('div');
  topBarBrandCaption.className = 'workspace-topbar-brand-caption';
  topBarBrandCaption.textContent = 'Desktop terminal workspace';
  topBarBrandText.append(topBarBrandName, topBarBrandCaption);
  topBarBrand.append(topBarBrandText);

  const topBarMeta = document.createElement('div');
  topBarMeta.className = 'workspace-topbar-meta';
  const topBarTitleEl = document.createElement('div');
  topBarTitleEl.className = 'workspace-topbar-title';
  topBarTitleEl.textContent = workspaceName(workspaceId);
  const topBarFolderEl = document.createElement('div');
  topBarFolderEl.className = 'workspace-topbar-folder';
  topBarFolderEl.textContent = 'No folder selected';
  const topBarCountsEl = document.createElement('div');
  topBarCountsEl.className = 'workspace-topbar-counts';
  topBarCountsEl.textContent = '0 terminals';
  topBarMeta.append(topBarTitleEl, topBarFolderEl, topBarCountsEl);

  const topBarActions = document.createElement('div');
  topBarActions.className = 'workspace-topbar-actions';
  const topBarNewTerminalEl = actionButton('New Terminal', 'New Terminal', 'gold');
  const topBarSavePresetEl = actionButton('Save Preset', 'Save Preset', 'ghost');
  const topBarApprovalsEl = actionButton('Approvals', 'Approvals', 'ghost');
  const topBarSettingsEl = actionButton('Settings', 'Settings', 'ghost');
  const topBarBackEl = actionButton('Back to Launcher', 'Back to Launcher', 'ghost');
  topBarActions.append(topBarNewTerminalEl, topBarSavePresetEl, topBarApprovalsEl, topBarSettingsEl, topBarBackEl);
  topBarEl.append(topBarBrand, topBarMeta, topBarActions);

  const shellBodyEl = document.createElement('div');
  shellBodyEl.className = 'workspace-shell-body';

  const railEl = document.createElement('aside');
  railEl.className = 'workspace-rail';
  const railHeading = document.createElement('div');
  railHeading.className = 'workspace-rail-heading';
  railHeading.textContent = 'Workspace';
  const railButtons: BrowserShellElements['railButtons'] = {
    workspace: railButton('Workspace', true),
    agents: railButton('Agents'),
    logs: railButton('Logs'),
    approvals: railButton('Approval Queue'),
    files: railButton('Files'),
    settings: railButton('Settings'),
  };
  const railList = document.createElement('div');
  railList.className = 'workspace-rail-list';
  railList.append(
    railButtons.workspace,
    railButtons.agents,
    railButtons.logs,
    railButtons.approvals,
    railButtons.files,
    railButtons.settings,
  );
  const railNote = document.createElement('div');
  railNote.className = 'workspace-rail-note';
  railNote.textContent = 'Terminal links open in the preview panel.';
  railEl.append(railHeading, railList, railNote);

  const workspacePaneEl = document.createElement('section');
  workspacePaneEl.className = 'workspace-pane';

  const workspaceEl = document.createElement('main');
  workspaceEl.className = 'workspace workspace-terminals';
  workspacePaneEl.append(workspaceEl);

  const approvalPanelEl = document.createElement('aside');
  approvalPanelEl.className = 'workspace-approval-panel';
  approvalPanelEl.tabIndex = -1;
  const approvalHeader = document.createElement('div');
  approvalHeader.className = 'workspace-approval-header';
  const approvalHeaderTitle = document.createElement('div');
  approvalHeaderTitle.className = 'workspace-approval-title';
  approvalHeaderTitle.textContent = 'Approval Queue';
  const approvalCountEl = document.createElement('span');
  approvalCountEl.className = 'workspace-approval-count';
  approvalCountEl.textContent = '0';
  approvalHeader.append(approvalHeaderTitle, approvalCountEl);

  const approvalListEl = document.createElement('div');
  approvalListEl.className = 'workspace-approval-list';
  approvalListEl.append(approvalEmptyState());

  const approvalFooterEl = document.createElement('div');
  approvalFooterEl.className = 'workspace-approval-footer';
  approvalPanelEl.append(approvalHeader, approvalListEl, approvalFooterEl);

  shellBodyEl.append(railEl, workspacePaneEl, approvalPanelEl);

  const statusBarEl = document.createElement('footer');
  statusBarEl.className = 'workspace-statusbar';
  const statusFolderEl = document.createElement('span');
  statusFolderEl.className = 'workspace-statusbar-item';
  statusFolderEl.textContent = 'No folder selected';
  const statusTerminalCountEl = document.createElement('span');
  statusTerminalCountEl.className = 'workspace-statusbar-item';
  statusTerminalCountEl.textContent = '0 terminals';
  const statusRunningCountEl = document.createElement('span');
  statusRunningCountEl.className = 'workspace-statusbar-item';
  statusRunningCountEl.textContent = '0 running';
  const statusAgentEl = document.createElement('span');
  statusAgentEl.className = 'workspace-statusbar-item';
  statusAgentEl.textContent = 'Universal agent: Empty Terminal';
  const statusAutoApproveEl = document.createElement('span');
  statusAutoApproveEl.className = 'workspace-statusbar-item';
  statusAutoApproveEl.textContent = 'Auto Approval: Off';
  const statusHealthEl = document.createElement('span');
  statusHealthEl.className = 'workspace-statusbar-item';
  statusHealthEl.textContent = 'Local workspace ready';
  statusBarEl.append(
    statusFolderEl,
    statusTerminalCountEl,
    statusRunningCountEl,
    statusAgentEl,
    statusAutoApproveEl,
    statusHealthEl,
  );

  // Detach topBarEl — the whole top band is removed; elements remain for JS refs
  topBarNewTerminalEl.className = 'workspace-statusbar-add-terminal';
  topBarSavePresetEl.className = 'workspace-statusbar-save-preset';
  const statusBarSpacer = document.createElement('span');
  statusBarSpacer.className = 'workspace-statusbar-spacer';
  statusBarEl.append(statusBarSpacer, topBarNewTerminalEl, topBarSavePresetEl);
  shellEl.append(shellBodyEl, statusBarEl);

  const splitterEl = document.createElement('div');
  splitterEl.className = 'workspace-browser-splitter';
  splitterEl.setAttribute('role', 'separator');
  splitterEl.setAttribute('aria-label', 'Resize browser preview');
  splitterEl.tabIndex = 0;

  const panelEl = document.createElement('aside');
  panelEl.className = 'workspace-browser-panel';
  panelEl.setAttribute('aria-label', `Browser preview for ${workspaceId}`);

  const toolbar = document.createElement('div');
  toolbar.className = 'browser-toolbar';

  const backButton = browserButton('Back', '<');
  const forwardButton = browserButton('Forward', '>');
  const reloadButton = browserButton('Reload', 'Reload');
  const externalButton = browserButton('Open external', 'Open');
  const collapseButton = browserButton('Close browser tab', 'X');

  const form = document.createElement('form');
  form.className = 'browser-url-form';
  const urlInput = document.createElement('input');
  urlInput.className = 'browser-url-input';
  urlInput.type = 'text';
  urlInput.spellcheck = false;
  urlInput.autocomplete = 'off';
  urlInput.setAttribute('aria-label', 'Browser URL');
  form.append(urlInput);

  const statusEl = document.createElement('div');
  statusEl.className = 'browser-status';
  statusEl.textContent = 'Click a terminal link to open it here.';

  toolbar.append(backButton, forwardButton, reloadButton, form, externalButton, collapseButton);

  const viewportEl = document.createElement('div');
  viewportEl.className = 'browser-viewport';

  panelEl.append(toolbar, viewportEl, statusEl);
  splitEl.append(shellEl, splitterEl, panelEl);

  for (const button of [backButton, forwardButton, reloadButton, externalButton, collapseButton]) {
    enableButtonMotion(button);
  }

  return {
    splitEl,
    shellEl,
    topBarEl,
    topBarTitleEl,
    topBarFolderEl,
    topBarCountsEl,
    topBarNewTerminalEl,
    topBarSavePresetEl,
    topBarApprovalsEl,
    topBarSettingsEl,
    topBarBackEl,
    railEl,
    railButtons,
    approvalPanelEl,
    approvalCountEl,
    approvalListEl,
    approvalFooterEl,
    statusBarEl,
    statusFolderEl,
    statusTerminalCountEl,
    statusRunningCountEl,
    statusAgentEl,
    statusAutoApproveEl,
    statusHealthEl,
    workspaceEl,
    splitterEl,
    panelEl,
    viewportEl,
    urlInput,
    statusEl,
    backButton,
    forwardButton,
    reloadButton,
    externalButton,
    collapseButton,
  };
}

function actionButton(label: string, text: string, kind: 'gold' | 'ghost'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = kind === 'gold' ? 'workspace-topbar-button primary-button' : 'workspace-topbar-button';
  button.textContent = text;
  button.setAttribute('aria-label', label);
  return button;
}

function railButton(label: string, active = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `workspace-rail-button${active ? ' active' : ''}`;
  button.textContent = label;
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  return button;
}


function approvalEmptyState(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'workspace-approval-empty';
  const title = document.createElement('div');
  title.className = 'workspace-approval-empty-title';
  title.textContent = 'No pending approvals';
  const body = document.createElement('div');
  body.className = 'workspace-approval-empty-body';
  body.textContent = 'Agent requests requiring review will appear here.';
  el.append(title, body);
  return el;
}

function browserButton(label: string, text: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'browser-toolbar-button';
  button.textContent = text;
  button.title = label;
  button.setAttribute('aria-label', label);
  return button;
}

interface ApprovalQueueItem extends TerminalApprovalRequestEvent {
  status: ApprovalQueueItemStatus;
  terminalNumber: number;
  enqueuedAt: number;
  resolvedAt: number | null;
  countdownEndsAt: number | null;
}

class WorkspaceTab implements TabBase {
  readonly id: string;
  readonly kind: 'workspace' = 'workspace';
  title: string;
  readonly panelEl: HTMLElement;
  readonly splitEl: HTMLElement;
  readonly shellEl: HTMLElement;
  readonly topBarEl: HTMLElement;
  readonly topBarTitleEl: HTMLElement;
  readonly topBarFolderEl: HTMLElement;
  readonly topBarCountsEl: HTMLElement;
  readonly topBarNewTerminalEl: HTMLButtonElement;
  readonly topBarSavePresetEl: HTMLButtonElement;
  readonly topBarApprovalsEl: HTMLButtonElement;
  readonly topBarSettingsEl: HTMLButtonElement;
  readonly topBarBackEl: HTMLButtonElement;
  readonly railEl: HTMLElement;
  readonly railButtons: Record<'workspace' | 'agents' | 'logs' | 'approvals' | 'files' | 'settings', HTMLButtonElement>;
  readonly approvalPanelEl: HTMLElement;
  readonly approvalCountEl: HTMLElement;
  readonly approvalListEl: HTMLElement;
  readonly approvalFooterEl: HTMLElement;
  readonly statusBarEl: HTMLElement;
  readonly statusFolderEl: HTMLElement;
  readonly statusTerminalCountEl: HTMLElement;
  readonly statusRunningCountEl: HTMLElement;
  readonly statusAgentEl: HTMLElement;
  readonly statusAutoApproveEl: HTMLElement;
  readonly statusHealthEl: HTMLElement;
  readonly workspaceEl: HTMLElement;
  tabButtonEl: HTMLButtonElement | null = null;
  private readonly store: WorkspaceStore;
  private readonly controllers = new Map<string, TerminalPaneController>();
  private readonly browser: WorkspaceBrowserController;
  private readonly approvalItems: ApprovalQueueItem[] = [];
  private readonly approvalCountdownTimers = new Map<string, number>();
  private readonly approvalRemovalTimers = new Map<string, number>();
  private approvalRequestOff: (() => void) | null = null;
  private approvalResolvedOff: (() => void) | null = null;
  private readonly pendingPickIds = new Set<string>();
  private isClosingPane = false;
  private isClosing = false;

  constructor(opts: {
    id: string;
    title: string;
    initialPaneCount: number;
    initialAssignments: PaneAssignment[];
    cwd: string | null;
  }) {
    this.id = opts.id;
    this.title = opts.title;
    this.store = new WorkspaceStore({
      ...createDefaultSettings(),
      defaultCwd: opts.cwd ?? '',
      fontSize: terminalSettings.fontSize,
      fontFamily: terminalSettings.fontFamily,
      copyOnSelect: terminalSettings.copyOnSelect,
      pasteConfirmForLargeText: terminalSettings.pasteConfirmForLargeText,
    });

    this.panelEl = document.createElement('section');
    this.panelEl.id = `panel-${opts.id}`;
    this.panelEl.className = 'tab-panel workspace-panel';
    this.panelEl.setAttribute('role', 'tabpanel');
    this.panelEl.setAttribute('aria-labelledby', `tab-${opts.id}`);
    this.panelEl.hidden = true;

    const browserShell = createBrowserShell(this.id);
    this.splitEl = browserShell.splitEl;
    this.shellEl = browserShell.shellEl;
    this.topBarEl = browserShell.topBarEl;
    this.topBarTitleEl = browserShell.topBarTitleEl;
    this.topBarFolderEl = browserShell.topBarFolderEl;
    this.topBarCountsEl = browserShell.topBarCountsEl;
    this.topBarNewTerminalEl = browserShell.topBarNewTerminalEl;
    this.topBarSavePresetEl = browserShell.topBarSavePresetEl;
    this.topBarApprovalsEl = browserShell.topBarApprovalsEl;
    this.topBarSettingsEl = browserShell.topBarSettingsEl;
    this.topBarBackEl = browserShell.topBarBackEl;
    this.railEl = browserShell.railEl;
    this.railButtons = browserShell.railButtons;
    this.approvalPanelEl = browserShell.approvalPanelEl;
    this.approvalCountEl = browserShell.approvalCountEl;
    this.approvalListEl = browserShell.approvalListEl;
    this.approvalFooterEl = browserShell.approvalFooterEl;
    this.statusBarEl = browserShell.statusBarEl;
    this.statusFolderEl = browserShell.statusFolderEl;
    this.statusTerminalCountEl = browserShell.statusTerminalCountEl;
    this.statusRunningCountEl = browserShell.statusRunningCountEl;
    this.statusAgentEl = browserShell.statusAgentEl;
    this.statusAutoApproveEl = browserShell.statusAutoApproveEl;
    this.statusHealthEl = browserShell.statusHealthEl;
    this.workspaceEl = browserShell.workspaceEl;
    this.browser = new WorkspaceBrowserController(this.id, browserShell, () => this.requestResizeAll());
    this.panelEl.append(this.splitEl);

    // Seed the store with the launcher's chosen layout & assignments.
    this.store.setPaneCount(opts.initialPaneCount);
    const panes = this.store.snapshot.panes;
    for (let i = 0; i < panes.length; i++) {
      const assignment = opts.initialAssignments[i] ?? 'shell';
      this.store.updatePane(panes[i].id, {
        assignment,
        launchContext: resolveContextForAssignment(assignment),
        cwd: opts.cwd ?? '',
        title: ASSIGNMENT_LABELS[assignment],
      });
    }

    this.bindWorkspaceChrome();
    this.bindApprovalEvents();
    this.renderWorkspaceChrome();
  }

  /** Attach to the workspace mount point. Called once by TabManager. */
  attach(mount: HTMLElement): void {
    mount.append(this.panelEl);
  }

  /** Hide / show this panel. Used on tab switch. */
  setActive(active: boolean): void {
    this.panelEl.hidden = !active;
    this.panelEl.setAttribute('aria-hidden', active ? 'false' : 'true');
    this.browser.setActive(active);
    if (active) {
      this.requestResizeAll();
      const focused = this.store.snapshot.focusedPaneId;
      if (focused) this.controllers.get(focused)?.focus();
    }
  }

  get paneCount(): number {
    return this.store.snapshot.settings.paneCount;
  }

  get runningPaneCount(): number {
    return this.store.snapshot.panes.filter((p) => p.status === 'running').length;
  }

  get totalPaneCount(): number {
    return this.store.snapshot.panes.length;
  }

  get errorPaneCount(): number {
    return this.store.snapshot.panes.filter((p) => p.status === 'error').length;
  }

  refreshApprovalQueue(): void {
    if (approvalSettings.autoApprovalEnabled) {
      this.startPendingAutoApprovalCountdowns();
    } else {
      this.stopAllAutoApprovalCountdowns();
    }
    this.renderApprovalQueue();
    this.statusAutoApproveEl.textContent = `Auto Approval: ${approvalSettings.autoApprovalEnabled ? 'On' : 'Off'}`;
  }

  focusNextPane(offset = 1): void {
    const panes = this.store.snapshot.panes;
    if (panes.length === 0) return;
    const currentIndex = Math.max(0, panes.findIndex((pane) => pane.id === this.store.snapshot.focusedPaneId));
    const next = panes[(currentIndex + offset + panes.length) % panes.length];
    if (!next) return;
    this.focusPane(next.id);
    this.controllers.get(next.id)?.focus();
  }

  /** Mount panes + grid for the first time. */
  initialRender(): void {
    this.syncWorkspace();
    const focused = this.store.snapshot.focusedPaneId;
    if (focused) this.controllers.get(focused)?.focus();
  }

  private bindWorkspaceChrome(): void {
    this.topBarNewTerminalEl.addEventListener('click', () => this.addPane());
    this.topBarSavePresetEl.addEventListener('click', () => {
      void this.saveWorkspacePreset();
    });
    this.topBarApprovalsEl.addEventListener('click', () => this.focusApprovalQueue());
    this.topBarSettingsEl.addEventListener('click', () => {
      if (settingsPanelEl?.hidden) openSettingsPanel();
      else closeSettingsPanel();
    });
    this.topBarBackEl.addEventListener('click', () => tabManager.switchTo(tabManager.homeId));

    this.railButtons.workspace.addEventListener('click', () => this.focusTerminalGrid());
    this.railButtons.agents.addEventListener('click', () => this.focusTerminalGrid());
    this.railButtons.logs.addEventListener('click', () => this.focusTerminalGrid());
    this.railButtons.approvals.addEventListener('click', () => this.focusApprovalQueue());
    this.railButtons.files.addEventListener('click', () => this.focusTerminalGrid());
    this.railButtons.settings.addEventListener('click', () => {
      if (settingsPanelEl?.hidden) openSettingsPanel();
      else closeSettingsPanel();
    });
  }

  private bindApprovalEvents(): void {
    this.approvalRequestOff = window.agentgridPty.onApprovalRequest((evt) => {
      this.handleApprovalRequest(evt);
    });
    this.approvalResolvedOff = window.agentgridPty.onApprovalResolved((evt) => {
      this.handleApprovalResolved(evt);
    });
  }

  private renderWorkspaceChrome(): void {
    const folder = this.store.snapshot.settings.defaultCwd || '';
    const folderLabel = folder ? workspaceName(folder) : 'No folder selected';
    const total = this.totalPaneCount;
    const running = this.runningPaneCount;
    const assignments = this.store.snapshot.panes.map((pane) => pane.assignment);
    const universal = inferBulkAssignment(assignments) ?? 'shell';
    const uniform = assignments.every((assignment) => assignment === assignments[0]);
    const statusText = this.statusTextForWorkspace();

    this.topBarTitleEl.textContent = this.title;
    this.topBarTitleEl.title = this.title;
    this.topBarFolderEl.textContent = folderLabel;
    this.topBarFolderEl.title = folder || folderLabel;
    this.topBarCountsEl.textContent = `${total} terminal${total === 1 ? '' : 's'} | ${running} running`;
    this.statusFolderEl.textContent = folderLabel;
    this.statusFolderEl.title = folder || folderLabel;
    this.statusTerminalCountEl.textContent = `${total} terminal${total === 1 ? '' : 's'}`;
    this.statusRunningCountEl.textContent = `${running} running`;
    this.statusAgentEl.textContent = `Universal agent: ${ASSIGNMENT_LABELS[universal]}`;
    this.statusAutoApproveEl.textContent = `Auto Approval: ${approvalSettings.autoApprovalEnabled ? 'On' : 'Off'}`;
    this.statusHealthEl.textContent = statusText;
    this.railButtons.workspace.classList.toggle('active', true);
    this.railButtons.agents.classList.toggle('active', false);
    this.railButtons.logs.classList.toggle('active', false);
    this.railButtons.approvals.classList.toggle('active', false);
    this.railButtons.files.classList.toggle('active', false);
    this.railButtons.settings.classList.toggle('active', false);
    this.topBarNewTerminalEl.disabled = this.paneCount >= WORKSPACE_PANE_COUNT_MAX;
    this.topBarNewTerminalEl.title = this.paneCount >= WORKSPACE_PANE_COUNT_MAX
      ? `Workspace limit reached (${WORKSPACE_PANE_COUNT_MAX} terminals)`
      : 'Create a new terminal';
    this.topBarSavePresetEl.disabled = !folder;
    this.topBarSavePresetEl.title = this.topBarSavePresetEl.disabled ? 'Choose a folder first' : 'Save this workspace as a preset';
    this.topBarApprovalsEl.title = 'Open the approval queue panel';
    this.topBarSettingsEl.title = 'Open settings';
    this.topBarBackEl.title = 'Return to the launcher';
    this.renderApprovalQueue();
    this.topBarApprovalsEl.setAttribute('aria-pressed', 'false');
    this.railButtons.workspace.setAttribute('aria-pressed', 'true');
    this.railButtons.agents.setAttribute('aria-pressed', 'false');
    this.railButtons.logs.setAttribute('aria-pressed', 'false');
    this.railButtons.approvals.setAttribute('aria-pressed', 'false');
    this.railButtons.files.setAttribute('aria-pressed', 'false');
    this.railButtons.settings.setAttribute('aria-pressed', 'false');
    this.topBarFolderEl.classList.toggle('is-empty', !folder);
    this.statusFolderEl.classList.toggle('is-empty', !folder);
    this.shellEl.dataset.mode = uniform ? 'uniform' : 'mixed';
    this.shellEl.dataset.status = statusText.toLowerCase();
  }

  private handleApprovalRequest(evt: TerminalApprovalRequestEvent): void {
    if (this.approvalItems.some((item) => item.requestId === evt.requestId)) return;
    const pane = this.store.snapshot.panes.find((item) => item.id === evt.paneId);
    if (!pane) return;

    const item: ApprovalQueueItem = {
      ...evt,
      terminalNumber: pane.layout.index + 1,
      status: 'pending',
      enqueuedAt: Date.now(),
      resolvedAt: null,
      countdownEndsAt: null,
    };
    this.approvalItems.push(item);
    this.renderApprovalQueue();
    this.startAutoApprovalCountdown(item);
  }

  private handleApprovalResolved(evt: ApprovalResolvedEvent): void {
    const item = this.approvalItems.find((candidate) => candidate.requestId === evt.requestId);
    if (!item) return;
    this.stopApprovalCountdown(evt.requestId);
    item.status = evt.status;
    item.resolvedAt = evt.resolvedAt;
    item.countdownEndsAt = null;
    this.renderApprovalQueue();
    this.scheduleApprovalRemoval(evt.requestId);
  }

  private renderApprovalQueue(): void {
    const pending = this.approvalItems.filter((item) => item.status === 'pending');
    this.approvalCountEl.textContent = String(pending.length);
    this.approvalPanelEl.dataset.state = pending.length > 0 ? 'pending' : 'empty';

    if (this.approvalItems.length === 0) {
      this.approvalListEl.replaceChildren(approvalEmptyState());
    } else {
      this.approvalListEl.replaceChildren(...this.approvalItems.map((item) => this.renderApprovalItem(item)));
    }

    const footerText = document.createElement('span');
    footerText.className = 'workspace-approval-footer-label';
    footerText.textContent = 'Auto-approve';

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'workspace-approval-toggle';
    toggleLabel.title = 'Toggle auto-approval of agent requests';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'workspace-approval-toggle-input';
    toggle.checked = approvalSettings.autoApprovalEnabled;
    toggle.setAttribute('aria-label', 'Toggle auto-approve');
    const track = document.createElement('span');
    track.className = 'workspace-approval-toggle-track';
    toggle.addEventListener('change', () => {
      void this.setAutoApprovalEnabled(toggle.checked);
    });
    toggleLabel.append(toggle, track);
    this.approvalFooterEl.replaceChildren(footerText, toggleLabel);
  }

  private renderApprovalItem(item: ApprovalQueueItem): HTMLElement {
    const card = document.createElement('article');
    card.className = `workspace-approval-card workspace-approval-item is-${item.status}`;

    // Meta row: terminal number + agent badge
    const head = document.createElement('div');
    head.className = 'workspace-approval-item-head';
    const termLabel = document.createElement('span');
    termLabel.className = 'workspace-approval-card-title';
    termLabel.textContent = `Terminal ${item.terminalNumber}`;
    const dot = document.createElement('span');
    dot.className = 'workspace-approval-item-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.textContent = '·';
    const agentBadge = document.createElement('span');
    agentBadge.className = 'workspace-approval-agent';
    agentBadge.textContent = item.agentName;
    head.append(termLabel, dot, agentBadge);

    // Request text
    const body = document.createElement('div');
    body.className = 'workspace-approval-card-body';
    body.textContent = item.prompt || 'Approval requested by terminal session.';

    // Action buttons — Decline (left/secondary) then Approve (right/primary)
    const actions = document.createElement('div');
    actions.className = 'workspace-approval-actions';
    const decline = document.createElement('button');
    decline.type = 'button';
    decline.className = 'workspace-approval-action decline';
    decline.textContent = 'Decline';
    decline.disabled = item.status !== 'pending';
    decline.addEventListener('click', () => {
      void this.resolveApproval(item.requestId, 'decline', 'manual');
    });
    const approve = document.createElement('button');
    approve.type = 'button';
    approve.className = 'workspace-approval-action approve';
    approve.textContent = 'Approve';
    approve.disabled = item.status !== 'pending';
    approve.addEventListener('click', () => {
      void this.resolveApproval(item.requestId, 'approve', 'manual');
    });
    actions.append(decline, approve);

    // Status / countdown
    const meta = document.createElement('div');
    meta.className = 'workspace-approval-meta';
    const showCountdown =
      item.status === 'pending' && approvalSettings.autoApprovalEnabled && item.countdownEndsAt !== null;
    if (showCountdown && item.countdownEndsAt !== null) {
      const remaining = Math.max(0, item.countdownEndsAt - Date.now());
      const pct = Math.min(100, (remaining / AUTO_APPROVAL_DELAY_MS) * 100);
      const countdownWrap = document.createElement('div');
      countdownWrap.className = 'workspace-approval-countdown';
      const track = document.createElement('div');
      track.className = 'workspace-approval-countdown-track';
      const fill = document.createElement('div');
      fill.className = 'workspace-approval-countdown-fill';
      fill.style.width = `${pct.toFixed(1)}%`;
      track.append(fill);
      const countdownLabel = document.createElement('div');
      countdownLabel.className = 'workspace-approval-countdown-label';
      countdownLabel.textContent = approvalItemStatusText(item);
      countdownWrap.append(track, countdownLabel);
      meta.append(countdownWrap);
    } else {
      meta.textContent = approvalItemStatusText(item);
    }

    card.append(head, body, actions, meta);
    return card;
  }

  private async setAutoApprovalEnabled(enabled: boolean): Promise<void> {
    if (enabled && !approvalSettings.suppressAutoApprovalWarning) {
      const warning = await showAutoApprovalWarning();
      const suppressAutoApprovalWarning =
        approvalSettings.suppressAutoApprovalWarning || warning.neverShowAgain;
      if (!warning.continueEnabled) {
        await updateApprovalSettings({
          autoApprovalEnabled: false,
          suppressAutoApprovalWarning,
        });
        this.stopAllAutoApprovalCountdowns();
        refreshApprovalQueues();
        return;
      }
      await updateApprovalSettings({
        autoApprovalEnabled: true,
        suppressAutoApprovalWarning,
      });
    } else {
      await updateApprovalSettings({ autoApprovalEnabled: enabled });
    }

    if (approvalSettings.autoApprovalEnabled) {
      this.startPendingAutoApprovalCountdowns();
    } else {
      this.stopAllAutoApprovalCountdowns();
    }
    refreshApprovalQueues();
  }

  private startPendingAutoApprovalCountdowns(): void {
    for (const item of this.approvalItems) {
      this.startAutoApprovalCountdown(item);
    }
  }

  private startAutoApprovalCountdown(item: ApprovalQueueItem): void {
    if (!approvalSettings.autoApprovalEnabled || item.status !== 'pending') return;
    if (this.approvalCountdownTimers.has(item.requestId)) return;

    item.countdownEndsAt = Date.now() + AUTO_APPROVAL_DELAY_MS;
    const tick = (): void => {
      if (!approvalSettings.autoApprovalEnabled || item.status !== 'pending') {
        this.stopApprovalCountdown(item.requestId);
        this.renderApprovalQueue();
        return;
      }
      if (Date.now() >= (item.countdownEndsAt ?? 0)) {
        this.stopApprovalCountdown(item.requestId);
        void this.resolveApproval(item.requestId, 'approve', 'auto');
        return;
      }
      this.renderApprovalQueue();
    };
    const timer = window.setInterval(tick, 250);
    this.approvalCountdownTimers.set(item.requestId, timer);
    this.renderApprovalQueue();
  }

  private stopApprovalCountdown(requestId: string): void {
    const timer = this.approvalCountdownTimers.get(requestId);
    if (timer !== undefined) {
      window.clearInterval(timer);
      this.approvalCountdownTimers.delete(requestId);
    }
    const item = this.approvalItems.find((candidate) => candidate.requestId === requestId);
    if (item) item.countdownEndsAt = null;
  }

  private stopAllAutoApprovalCountdowns(): void {
    for (const requestId of this.approvalCountdownTimers.keys()) {
      this.stopApprovalCountdown(requestId);
    }
  }

  private async resolveApproval(
    requestId: string,
    action: ApprovalAction,
    mode: ApprovalResolveMode,
  ): Promise<void> {
    const item = this.approvalItems.find((candidate) => candidate.requestId === requestId);
    if (!item || item.status !== 'pending') return;
    this.stopApprovalCountdown(requestId);
    item.status = mode === 'auto' ? 'auto-approved' : action === 'approve' ? 'approved' : 'declined';
    item.resolvedAt = Date.now();
    this.renderApprovalQueue();

    const result = await window.agentgridPty.resolveApproval({
      requestId: item.requestId,
      ptyId: item.ptyId,
      action,
      mode,
    });
    if (!result.ok) {
      item.status = 'dismissed';
      item.resolvedAt = Date.now();
    }
    this.renderApprovalQueue();
    this.scheduleApprovalRemoval(requestId);
  }

  private scheduleApprovalRemoval(requestId: string): void {
    if (this.approvalRemovalTimers.has(requestId)) return;
    const timer = window.setTimeout(() => {
      this.approvalRemovalTimers.delete(requestId);
      const index = this.approvalItems.findIndex((item) => item.requestId === requestId);
      if (index !== -1) {
        this.approvalItems.splice(index, 1);
        this.renderApprovalQueue();
      }
    }, 1200);
    this.approvalRemovalTimers.set(requestId, timer);
  }

  private statusTextForWorkspace(): string {
    const running = this.runningPaneCount;
    const total = this.totalPaneCount;
    if (total === 0) return 'No terminals';
    if (running === total) return 'All terminals running';
    if (running > 0) return 'Some terminals running';
    return 'Terminals ready';
  }

  private focusTerminalGrid(): void {
    const first = this.controllers.values().next().value as TerminalPaneController | undefined;
    first?.focus();
  }

  private focusApprovalQueue(): void {
    this.approvalPanelEl.focus({ preventScroll: true });
    this.approvalPanelEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this.railButtons.approvals.classList.add('active');
    this.railButtons.workspace.classList.remove('active');
  }

  private saveWorkspacePreset(): void {
    const snapshot = this.store.snapshot;
    const paneCount = snapshot.settings.paneCount;
    const assignments = snapshot.panes.map((pane) => pane.assignment);
    openPresetNameDialog(paneCount, assignments);
  }

  injectAgentMondayPrompts(routes: readonly AgentMondayRoute[], opts: { matchByCli?: boolean } = {}): void {
    const panes = this.store.snapshot.panes;
    const usedPaneIds = new Set<string>();
    routes.forEach((route, index) => {
      const pane = opts.matchByCli
        ? panes.find((candidate) => candidate.assignment === route.cli && !usedPaneIds.has(candidate.id))
        : panes[index];
      if (!pane) return;
      usedPaneIds.add(pane.id);
      this.injectTextAfterSpawn(pane.id, `${route.supervisedPrompt}\r`, {
        initialDelayMs: 1800 + index * 300,
        timeoutMs: 12000,
      });
    });
  }

  canSatisfyAgentMondayRoutes(routes: readonly AgentMondayRoute[]): boolean {
    const available = new Map<PaneAssignment, number>();
    for (const pane of this.store.snapshot.panes) {
      available.set(pane.assignment, (available.get(pane.assignment) ?? 0) + 1);
    }
    for (const route of routes) {
      const count = available.get(route.cli) ?? 0;
      if (count <= 0) return false;
      available.set(route.cli, count - 1);
    }
    return true;
  }

  injectTextAfterSpawn(
    paneId: string,
    text: string,
    opts: { initialDelayMs?: number; timeoutMs?: number } = {},
  ): void {
    const startedAt = Date.now();
    const initialDelayMs = opts.initialDelayMs ?? 0;
    const timeoutMs = opts.timeoutMs ?? 8000;

    const attempt = (): void => {
      const pane = this.store.snapshot.panes.find((item) => item.id === paneId);
      const controller = this.controllers.get(paneId);
      if (pane?.status === 'running' && controller?.writeText(text)) return;
      if (Date.now() - startedAt >= timeoutMs) {
        this.store.updatePane(paneId, {
          errorMessage: 'Agent Monday could not inject the prompt because this pane is not running.',
        });
        this.renderPaneChrome(paneId);
        return;
      }
      window.setTimeout(attempt, 250);
    };

    window.setTimeout(attempt, initialDelayMs);
  }

  setPaneCount(count: number): void {
    const nextCount = clampPaneCount(count, WORKSPACE_PANE_COUNT_MAX);
    if (nextCount === this.store.snapshot.settings.paneCount) return;
    const before = new Set(this.store.snapshot.panes.map((p) => p.id));
    const { removed } = this.store.setPaneCount(nextCount);
    for (const pane of removed) {
      const controller = this.controllers.get(pane.id);
      void controller?.dispose();
      this.controllers.delete(pane.id);
    }
    // Newly added panes wait for the user to pick an assignment so we don't
    // silently spawn shells when they used the header pane-count picker.
    for (const pane of this.store.snapshot.panes) {
      if (!before.has(pane.id)) this.pendingPickIds.add(pane.id);
    }
    this.syncWorkspace();
    this.requestResizeAll();
    const focused = this.store.snapshot.focusedPaneId;
    if (focused) this.controllers.get(focused)?.focus();
  }

  addPane(): void {
    if (this.paneCount >= WORKSPACE_PANE_COUNT_MAX) return;
    this.setPaneCount(this.paneCount + 1);
  }

  setBrowserSuppressed(suppressed: boolean): void {
    this.browser.setSuppressed(suppressed);
  }

  private openBrowserLink = (url: string): void => {
    this.browser.openUrl(url);
  };

  private focusPane = (id: string): void => {
    this.store.focusPane(id);
    for (const pane of this.store.snapshot.panes) {
      this.renderPaneChrome(pane.id);
    }
    this.renderWorkspaceChrome();
  };

  private requestPaneClose = (id: string): void => {
    void this.closePane(id);
  };

  private renderPaneChrome(paneId: string): void {
    const pane = this.store.snapshot.panes.find((item) => item.id === paneId);
    const controller = this.controllers.get(paneId);
    if (!pane || !controller) return;
    controller.update(pane);
    this.renderWorkspaceChrome();
    onWorkspaceTabChromeChange();
  }

  private syncWorkspace(): void {
    applyWorkspaceGrid(this.workspaceEl, this.store.snapshot.settings.paneCount);
    for (const pane of this.store.snapshot.panes) {
      let controller = this.controllers.get(pane.id);
      if (!controller) {
        controller = new TerminalPaneController(pane, this.store, {
          onFocus: this.focusPane,
          onRequestClose: this.requestPaneClose,
          onChromeChange: () => onWorkspaceTabChromeChange(),
          onOpenLink: this.openBrowserLink,
        });
        this.controllers.set(pane.id, controller);
        if (this.pendingPickIds.has(pane.id)) {
          controller.requirePick();
          this.pendingPickIds.delete(pane.id);
        }
        controller.mount(this.workspaceEl);
      } else {
        controller.update(pane);
      }
    }
    this.renderWorkspaceChrome();
    onWorkspaceTabChromeChange();
  }

  private requestResizeAll(): void {
    for (const c of this.controllers.values()) {
      try {
        c.requestResize();
      } catch {
        // never let one stuck pane block reflow of the rest
      }
    }
  }

  /**
   * Close a single pane: dispose controller (kills PTY), remove from store,
   * reflow remaining panes. If the last pane closes, the tab itself remains
   * open but empty â€” the user can use the +/- pane-count picker or close
   * the whole tab.
   */
  private async closePane(id: string): Promise<void> {
    if (this.isClosingPane || this.isClosing) return;
    this.isClosingPane = true;
    try {
      const controller = this.controllers.get(id);
      const removed = this.store.removePane(id);
      if (!removed) return;
      this.controllers.delete(id);

      let disposePromise: Promise<void> = Promise.resolve();
      if (controller) {
        try {
          disposePromise = controller.dispose().catch(() => {});
        } catch (err) {
          console.warn('[workspace] controller.dispose threw synchronously', err);
        }
      }

      if (this.store.snapshot.panes.length === 0) {
        await disposePromise;
        // No panes left in this workspace; close the whole tab so the user
        // doesn't end up staring at an empty workspace shell.
        void tabManager.closeTab(this.id);
        return;
      }

      this.syncWorkspace();
      this.requestResizeAll();
      const focused = this.store.snapshot.focusedPaneId;
      if (focused) this.controllers.get(focused)?.focus();
      void disposePromise;
    } finally {
      this.isClosingPane = false;
    }
  }

  /**
   * Tab-level close. Tears down every pane via the real dispose() path,
   * waits for them to settle (or hit the per-pane timeout), and only then
   * removes the panel from the DOM. Idempotent and safe to call while
   * panes are running.
   */
  async dispose(): Promise<void> {
    if (this.isClosing) return;
    this.isClosing = true;

    this.panelEl.classList.add('is-closing');
    this.browser.destroy();
    this.approvalRequestOff?.();
    this.approvalResolvedOff?.();
    this.approvalRequestOff = null;
    this.approvalResolvedOff = null;
    this.stopAllAutoApprovalCountdowns();
    for (const timer of this.approvalRemovalTimers.values()) {
      window.clearTimeout(timer);
    }
    this.approvalRemovalTimers.clear();

    const snapshot = Array.from(this.controllers.values());
    this.controllers.clear();

    const pending: Promise<void>[] = snapshot.map((controller) => {
      try {
        return controller.dispose().catch(() => undefined);
      } catch (err) {
        console.warn('[workspace-tab] dispose threw synchronously; continuing', err);
        return Promise.resolve();
      }
    });
    await Promise.all(pending);

    // Animate panel out, then unmount.
    try {
      await fadeOut(this.panelEl, { y: -MOTION_Y_SM, duration: 0.18 });
    } catch {
      // ignore
    }
    this.panelEl.remove();
  }

  /** Shutdown variant â€” main process owns PTY teardown during quit. */
  disposeForShutdown(): void {
    this.browser.destroy();
    this.approvalRequestOff?.();
    this.approvalResolvedOff?.();
    this.approvalRequestOff = null;
    this.approvalResolvedOff = null;
    this.stopAllAutoApprovalCountdowns();
    for (const timer of this.approvalRemovalTimers.values()) {
      window.clearTimeout(timer);
    }
    this.approvalRemovalTimers.clear();
    for (const c of this.controllers.values()) {
      try {
        c.disposeForShutdown();
      } catch {
        // best-effort during shutdown
      }
    }
    this.controllers.clear();
  }
}

// â”€â”€â”€ Tab manager â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class TabManager {
  private readonly home: HomeTab;
  private readonly workspaces: WorkspaceTab[] = [];
  private workspaceSeq = 1;
  private activeId: string;

  constructor(home: HomeTab) {
    this.home = home;
    this.activeId = home.id;
    this.renderTabBar();
  }

  get activeTab(): HomeTab | WorkspaceTab {
    if (this.activeId === this.home.id) return this.home;
    const ws = this.workspaces.find((w) => w.id === this.activeId);
    return ws ?? this.home;
  }

  get workspaceTabs(): readonly WorkspaceTab[] {
    return this.workspaces;
  }

  getWorkspaceById(id: string): WorkspaceTab | null {
    return this.workspaces.find((workspace) => workspace.id === id) ?? null;
  }

  get homeId(): string {
    return this.home.id;
  }

  /** Open a brand-new workspace tab and switch to it. */
  openWorkspaceTab(opts: { paneCount: number; assignments: PaneAssignment[]; cwd: string | null }): WorkspaceTab {
    const id = `workspace-${this.workspaceSeq++}`;
    const title = `Workspace ${this.workspaceSeq - 1}`;
    const tab = new WorkspaceTab({
      id,
      title,
      initialPaneCount: opts.paneCount,
      initialAssignments: opts.assignments,
      cwd: opts.cwd,
    });
    this.workspaces.push(tab);
    tab.attach(workspaceMountEl!);
    tab.initialRender();
    this.renderTabBar();
    this.switchTo(id);
    return tab;
  }

  async closeAllWorkspaceTabs(): Promise<void> {
    const tabs = [...this.workspaces];
    for (const tab of tabs) {
      await this.closeTab(tab.id);
    }
  }

  async replaceWorkspaceTabs(opts: { paneCount: number; assignments: PaneAssignment[]; cwd: string | null }): Promise<WorkspaceTab> {
    await this.closeAllWorkspaceTabs();
    return this.openWorkspaceTab(opts);
  }

  /**
   * Close a workspace tab. Runs the real teardown path on every pane in
   * the tab before removing it from the DOM. Home cannot be closed.
   */
  async closeTab(id: string): Promise<void> {
    if (id === this.home.id) return;
    const idx = this.workspaces.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const tab = this.workspaces[idx];

    // If we're closing the currently-visible tab, switch away first so
    // the user sees Home (or another workspace) instead of an empty
    // panel during the teardown animation.
    const wasActive = this.activeId === id;
    if (wasActive) {
      const fallback = this.workspaces[idx + 1] ?? this.workspaces[idx - 1];
      this.switchTo(fallback?.id ?? this.home.id);
    }

    this.workspaces.splice(idx, 1);
    this.renderTabBar();
    await tab.dispose();
  }

  switchTo(id: string): void {
    if (id === this.activeId) return;
    const previous = this.activeTab;
    this.activeId = id;
    const next = this.activeTab;

    // Cross-fade by hiding the previous and showing the next. A short
    // fade-in on the new panel makes the transition feel intentional
    // instead of abrupt.
    if (previous && previous !== next) {
      if (previous.kind === 'home') {
        previous.panelEl.hidden = true;
      } else {
        previous.setActive(false);
      }
    }
    if (next.kind === 'home') {
      next.panelEl.hidden = false;
      void fadeIn(next.panelEl, { y: MOTION_Y_SM, duration: 0.26 });
    } else {
      next.setActive(true);
      void fadeIn(next.panelEl, { y: MOTION_Y_SM, duration: 0.26 });
    }

    this.renderTabBar();
    onWorkspaceTabChromeChange();
  }

  switchByOffset(offset: number): void {
    const tabs: Array<HomeTab | WorkspaceTab> = [this.home, ...this.workspaces];
    const currentIndex = Math.max(0, tabs.findIndex((tab) => tab.id === this.activeTab.id));
    const next = tabs[(currentIndex + offset + tabs.length) % tabs.length];
    if (next) this.switchTo(next.id);
  }

  closeActiveWorkspace(): void {
    const active = this.activeTab;
    if (active.kind === 'workspace') {
      void this.closeTab(active.id);
    }
  }

  setBrowserPreviewsSuppressed(suppressed: boolean): void {
    for (const workspace of this.workspaces) {
      workspace.setBrowserSuppressed(suppressed);
    }
  }

  focusNextPane(offset = 1): void {
    const active = this.activeTab;
    if (active.kind === 'workspace') {
      active.focusNextPane(offset);
    }
  }

  renderTabBar(): void {
    syncSidebarHomeState(this.activeId === this.home.id);
    sidebarWorkspacesEl!.replaceChildren();
    for (const ws of this.workspaces) {
      const isActive = this.activeId === ws.id;
      const btn = this.makeTabButton({
        id: ws.id,
        label: ws.title,
        isActive,
        onClick: () => this.switchTo(ws.id),
        onClose: () => {
          void this.closeTab(ws.id);
        },
        runningCount: ws.runningPaneCount,
        totalCount: ws.totalPaneCount,
      });
      ws.tabButtonEl = btn;
      sidebarWorkspacesEl!.append(btn);
    }
  }

  /** Update meta indicators on each tab's button (running counts, etc). */
  refreshIndicators(): void {
    for (const ws of this.workspaces) {
      const btn = ws.tabButtonEl;
      if (!btn) continue;
      const meta = btn.querySelector('.tab-meta');
      if (meta) {
        meta.textContent = ws.runningPaneCount > 0
          ? `${ws.runningPaneCount}/${ws.totalPaneCount}`
          : `${ws.totalPaneCount}`;
        meta.classList.toggle('has-running', ws.runningPaneCount > 0);
        meta.classList.toggle('has-error', ws.errorPaneCount > 0);
      }
    }
    renderOpenWorkspaces();
  }

  private makeTabButton(opts: {
    id: string;
    label: string;
    iconHTML?: string;
    isActive: boolean;
    onClick: () => void;
    onClose?: () => void;
    runningCount?: number;
    totalCount?: number;
  }): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `tab-${opts.id}`;
    btn.className = `tab-button${opts.isActive ? ' active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', opts.isActive ? 'true' : 'false');
    btn.setAttribute('aria-controls', `panel-${opts.id}`);
    btn.addEventListener('click', opts.onClick);
    enableButtonMotion(btn);

    if (opts.iconHTML) {
      const icon = document.createElement('span');
      icon.className = 'tab-icon';
      icon.innerHTML = opts.iconHTML;
      btn.append(icon);
    }

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = opts.label;
    btn.append(label);

    if (typeof opts.runningCount === 'number') {
      const meta = document.createElement('span');
      meta.className = 'tab-meta';
      const total = opts.totalCount ?? 0;
      meta.textContent = opts.runningCount > 0
        ? `${opts.runningCount}/${total}`
        : `${total}`;
      meta.classList.toggle('has-running', opts.runningCount > 0);
      btn.append(meta);
    }

    if (opts.onClose) {
      const close = document.createElement('span');
      close.className = 'tab-close';
      close.setAttribute('role', 'button');
      close.setAttribute('aria-label', 'Close tab');
      close.tabIndex = 0;
      close.textContent = '\u00D7';
      enableButtonMotion(close);
      const handle = (event: Event): void => {
        event.stopPropagation();
        event.preventDefault();
        opts.onClose?.();
      };
      close.addEventListener('click', handle);
      close.addEventListener('keydown', (event) => {
        if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') {
          handle(event);
        }
      });
      btn.append(close);
    }

    return btn;
  }
}

// â”€â”€â”€ Launcher draft (lives on the Home tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface LauncherDraft {
  paneCount: number;
  assignments: PaneAssignment[];
  projectFolder: string | null;
  bulkAssignment: PaneAssignment | null;
}

const launcherDraft: LauncherDraft = {
  paneCount: 1,
  assignments: ['shell'],
  projectFolder: null,
  bulkAssignment: 'shell',
};

let setupStep: 1 | 2 = 1;

let appState: PersistedAppState = cloneAppState(DEFAULT_APP_STATE);
let terminalSettings: TerminalSettings = {
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: DEFAULT_FONT_FAMILY,
  copyOnSelect: false,
  pasteConfirmForLargeText: true,
};
let approvalSettings: ApprovalSettings = {
  autoApprovalEnabled: false,
  suppressAutoApprovalWarning: false,
};

function ensureAssignmentsLength(draft: LauncherDraft): void {
  draft.paneCount = clampPaneCount(draft.paneCount, LAUNCHER_PANE_COUNT_MAX);
  while (draft.assignments.length < draft.paneCount) {
    draft.assignments.push(draft.bulkAssignment ?? 'shell');
  }
  if (draft.assignments.length > draft.paneCount) {
    draft.assignments.length = draft.paneCount;
  }
}

function cloneAppState<T extends PersistedAppState>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}

function launcherDefaultsPatch(): AppStatePatch {
  ensureAssignmentsLength(launcherDraft);
  return {
    launcherDefaults: {
      selectedFolder: launcherDraft.projectFolder,
      paneCount: launcherDraft.paneCount,
      bulkAssignment: launcherDraft.bulkAssignment,
      assignments: [...launcherDraft.assignments],
    },
  };
}

function applyLoadedAppState(state: PersistedAppState): void {
  appState = state;
  const defaults = state.launcherDefaults;
  launcherDraft.projectFolder = defaults.selectedFolder;
  launcherDraft.paneCount = clampPaneCount(defaults.paneCount, LAUNCHER_PANE_COUNT_MAX);
  launcherDraft.assignments = [...defaults.assignments];
  launcherDraft.bulkAssignment = defaults.bulkAssignment ?? inferBulkAssignment(defaults.assignments) ?? 'shell';
  ensureAssignmentsLength(launcherDraft);
  terminalSettings = {
    fontSize: state.terminalSettings.fontSize,
    fontFamily: state.terminalSettings.fontFamily || DEFAULT_FONT_FAMILY,
    copyOnSelect: state.terminalSettings.copyOnSelect,
    pasteConfirmForLargeText: state.terminalSettings.pasteConfirmForLargeText,
  };
  approvalSettings = {
    autoApprovalEnabled: state.approvalSettings.autoApprovalEnabled,
    suppressAutoApprovalWarning: state.approvalSettings.suppressAutoApprovalWarning,
  };
}

async function patchAppState(patch: AppStatePatch): Promise<void> {
  const bridge = window.agentgridAppState;
  if (!bridge) {
    appState = {
      ...appState,
      ...patch,
      launcherDefaults: patch.launcherDefaults
        ? { ...appState.launcherDefaults, ...patch.launcherDefaults }
        : appState.launcherDefaults,
      terminalSettings: patch.terminalSettings
        ? { ...appState.terminalSettings, ...patch.terminalSettings }
        : appState.terminalSettings,
      approvalSettings: patch.approvalSettings
        ? { ...appState.approvalSettings, ...patch.approvalSettings }
        : appState.approvalSettings,
      presets: patch.presets !== undefined ? patch.presets : appState.presets,
      updatedAt: Date.now(),
    };
    return;
  }
  try {
    appState = await bridge.patch(patch);
    if (patch.approvalSettings) {
      approvalSettings = { ...appState.approvalSettings };
    }
    if (patch.terminalSettings) {
      terminalSettings = { ...appState.terminalSettings };
    }
  } catch (err) {
    console.warn('[app-state] patch failed', err);
  }
}

async function updateApprovalSettings(patch: Partial<ApprovalSettings>): Promise<void> {
  approvalSettings = { ...approvalSettings, ...patch };
  await patchAppState({ approvalSettings });
  refreshApprovalQueues();
}

function refreshApprovalQueues(): void {
  if (typeof tabManager === 'undefined') return;
  for (const workspace of tabManager.workspaceTabs) {
    workspace.refreshApprovalQueue();
  }
}

function approvalItemStatusText(item: ApprovalQueueItem): string {
  if (item.status === 'pending' && approvalSettings.autoApprovalEnabled && item.countdownEndsAt) {
    const remainingMs = Math.max(0, item.countdownEndsAt - Date.now());
    const s = Math.ceil(remainingMs / 1000);
    return `Auto-approving in ${s}s…`;
  }
  if (item.status === 'pending') return 'Waiting for review';
  if (item.status === 'approved') return 'Approved';
  if (item.status === 'declined') return 'Declined';
  if (item.status === 'auto-approved') return 'Auto-approved';
  return 'Dismissed';
}

function showAutoApprovalWarning(): Promise<{ continueEnabled: boolean; neverShowAgain: boolean }> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'approval-warning-overlay';
    overlay.setAttribute('role', 'presentation');

    const modal = document.createElement('section');
    modal.className = 'approval-warning-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'approval-warning-title');

    const title = document.createElement('h2');
    title.id = 'approval-warning-title';
    title.className = 'approval-warning-title';
    title.textContent = 'Enable Auto-Approval?';

    const copy = document.createElement('p');
    copy.className = 'approval-warning-body';
    copy.textContent =
      'Auto-approving CLI agent requests runs commands without your review. Dangerous or unexpected commands may execute automatically.';

    const neverLabel = document.createElement('label');
    neverLabel.className = 'approval-warning-checkbox';
    const never = document.createElement('input');
    never.type = 'checkbox';
    never.className = 'approval-warning-never-input';
    const neverText = document.createElement('span');
    neverText.textContent = "Don't show this warning again";
    neverLabel.append(never, neverText);

    const actions = document.createElement('div');
    actions.className = 'approval-warning-actions';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'approval-warning-button secondary';
    back.textContent = 'No, go back';
    const proceed = document.createElement('button');
    proceed.type = 'button';
    proceed.className = 'approval-warning-button primary';
    proceed.textContent = 'Continue';
    actions.append(back, proceed);

    const close = (continueEnabled: boolean): void => {
      const neverShowAgain = never.checked;
      overlay.remove();
      resolve({ continueEnabled, neverShowAgain });
    };
    back.addEventListener('click', () => close(false));
    proceed.addEventListener('click', () => close(true));
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close(false);
    });

    modal.append(title, copy, neverLabel, actions);
    overlay.append(modal);
    document.body.append(overlay);
    window.setTimeout(() => back.focus(), 0);
  });
}

async function persistLauncherDefaults(): Promise<void> {
  await patchAppState(launcherDefaultsPatch());
}

function workspaceName(folder: string): string {
  const parts = folder.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? folder;
}

function createLaunchConfig(): WorkspaceLaunchConfig | null {
  ensureAssignmentsLength(launcherDraft);
  if (!launcherDraft.projectFolder) return null;
  return {
    folder: launcherDraft.projectFolder,
    paneCount: launcherDraft.paneCount,
    bulkAssignment: launcherDraft.bulkAssignment,
    assignments: [...launcherDraft.assignments],
    launchContext: 'native',
    launchedAt: Date.now(),
  };
}

function recentEntryFromLaunch(config: WorkspaceLaunchConfig): RecentWorkspaceEntry {
  return {
    folder: config.folder,
    name: workspaceName(config.folder),
    lastLaunchedAt: config.launchedAt,
    paneCount: config.paneCount,
    bulkAssignment: config.bulkAssignment,
    assignments: [...config.assignments],
  };
}

function mergeRecentWorkspace(entry: RecentWorkspaceEntry): RecentWorkspaceEntry[] {
  const withoutSameFolder = appState.recentWorkspaces.filter((item) => item.folder !== entry.folder);
  return [entry, ...withoutSameFolder].slice(0, 8);
}

async function recordWorkspaceLaunch(): Promise<void> {
  const config = createLaunchConfig();
  await patchAppState({
    ...launcherDefaultsPatch(),
    lastWorkspaceLaunch: config,
    recentWorkspaces: config ? mergeRecentWorkspace(recentEntryFromLaunch(config)) : appState.recentWorkspaces,
  });
  renderRecentWorkspaces();
  renderSettings();
}

async function recordWorkspaceLaunchConfig(config: WorkspaceLaunchConfig): Promise<void> {
  await patchAppState({
    lastWorkspaceLaunch: config,
    recentWorkspaces: mergeRecentWorkspace(recentEntryFromLaunch(config)),
  });
  renderRecentWorkspaces();
  renderSettings();
}

function applyLaunchConfigToDraft(config: WorkspaceLaunchConfig | RecentWorkspaceEntry): void {
  launcherDraft.projectFolder = config.folder;
  launcherDraft.paneCount = clampPaneCount(config.paneCount, LAUNCHER_PANE_COUNT_MAX);
  launcherDraft.assignments = [...config.assignments];
  launcherDraft.bulkAssignment = config.bulkAssignment ?? inferBulkAssignment(config.assignments) ?? 'shell';
  ensureAssignmentsLength(launcherDraft);
  resetAgentMondayRouteForLauncherChange('Workspace defaults changed. Plan agents again to refresh the route preview.');
  renderLauncher();
}

// CLI health is informational only. Shell panes always remain launchable.
const CLI_HEALTH_KINDS: readonly CliKind[] = ['codex', 'claude', 'gemini'];
const CLI_HEALTH_LABELS: Record<CliKind, string> = {
  codex: 'Codex',
  claude: 'Claude Code',
  gemini: 'Gemini',
};

interface CliHealthState {
  bridgeAvailable: boolean;
  isChecking: boolean;
  results: Partial<Record<CliKind, CliDetectionResult>>;
  checkError: string | null;
  actionError: string | null;
}

const cliHealthState: CliHealthState = {
  bridgeAvailable: Boolean(window.agentgridCli),
  isChecking: true,
  results: Object.fromEntries(
    CLI_HEALTH_KINDS.map((kind) => [kind, makeCliHealthResult(kind, 'checking')]),
  ) as Partial<Record<CliKind, CliDetectionResult>>,
  checkError: null,
  actionError: null,
};

let cliHealthRequestSeq = 0;

function makeCliHealthResult(
  kind: CliKind,
  status: CliDetectionStatus,
  extra: Partial<CliDetectionResult> = {},
): CliDetectionResult {
  return {
    kind,
    status,
    checkedAt: Date.now(),
    ...extra,
  };
}

function cliHealthStatusText(status: CliDetectionStatus): string {
  if (status === 'available') return 'Ready';
  if (status === 'checking') return 'Checking';
  if (status === 'missing') return 'Missing';
  if (status === 'invocation_failed') return 'Failed';
  if (status === 'unsupported') return 'Unsupported';
  if (status === 'soon') return 'Not wired';
  return 'Unknown';
}

function cliHealthDetail(result: CliDetectionResult): string {
  if (result.status === 'available') {
    return result.via === 'wsl' ? 'Available through WSL' : 'Detected locally';
  }
  if (result.status === 'missing') return 'Setup needed before auto-launch.';
  if (result.status === 'invocation_failed') return 'Detected but not responding.';
  if (result.status === 'unsupported') return 'Not supported on this platform.';
  if (result.status === 'checking') return 'Checking local tools.';
  if (result.status === 'soon') return 'Detection is not available yet.';
  return 'Run a check to update this status.';
}

function cliLaunchBlocker(assignment: PaneAssignment): string | null {
  void assignment;
  return null;
}

function summarizeCliHealth(): { text: string; tone: 'checking' | 'ready' | 'warning' | 'error' | 'muted' } {
  if (!cliHealthState.bridgeAvailable) {
    return { text: 'CLI bridge unavailable', tone: 'error' };
  }
  if (cliHealthState.checkError) {
    return { text: 'CLI health check failed', tone: 'error' };
  }
  if (cliHealthState.actionError) {
    return { text: cliHealthState.actionError, tone: 'error' };
  }
  if (cliHealthState.isChecking) {
    return { text: 'Checking CLI tools', tone: 'checking' };
  }

  const results = CLI_HEALTH_KINDS.map((kind) => cliHealthState.results[kind] ?? makeCliHealthResult(kind, 'unknown'));
  const missing = results.filter((result) => result.status === 'missing').length;
  const failed = results.filter((result) => result.status === 'invocation_failed').length;
  const unsupported = results.filter((result) => result.status === 'unsupported' || result.status === 'soon').length;
  const unknown = results.filter((result) => result.status === 'unknown').length;

  if (results.every((result) => result.status === 'available')) {
    return { text: 'All tools ready', tone: 'ready' };
  }

  const parts: string[] = [];
  if (missing > 0) parts.push(`${missing} missing`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (unsupported > 0) parts.push(`${unsupported} unsupported`);
  if (unknown > 0) parts.push(`${unknown} unknown`);
  return {
    text: parts.length > 0 ? `Needs setup: ${parts.join(', ')}` : 'CLI status unknown',
    tone: failed > 0 ? 'error' : missing > 0 ? 'warning' : 'muted',
  };
}


function renderCliHealth(): void {
  const summary = summarizeCliHealth();
  cliHealthSummaryEl!.textContent = summary.text;
  cliHealthSummaryEl!.className = `cli-health-summary cli-health-tone-${summary.tone}`;
  cliHealthListEl!.replaceChildren();
  cliHealthListEl!.hidden = false;

  for (const kind of CLI_HEALTH_KINDS) {
    const result = cliHealthState.results[kind] ?? makeCliHealthResult(kind, 'unknown');
    const row = document.createElement('div');
    row.className = `cli-health-row cli-health-status-${result.status}`;

    const name = document.createElement('span');
    name.className = 'cli-health-name';
    name.textContent = CLI_HEALTH_LABELS[kind];

    const badge = document.createElement('span');
    badge.className = 'cli-health-badge';
    badge.textContent = cliHealthStatusText(result.status);

    const detail = document.createElement('span');
    detail.className = 'cli-health-detail';
    detail.textContent = cliHealthDetail(result);
    detail.title = cliHealthDetail(result);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'cli-health-action';
    action.textContent = result.status === 'available' ? 'Ready' : 'Setup';
    action.disabled = result.status === 'available' || result.status === 'checking';
    action.addEventListener('click', () => {
      void openCliInstall(kind);
    });
    enableButtonMotion(action);

    row.append(name, badge, detail, action);
    cliHealthListEl!.append(row);
  }

  if (agentMondayState.route && agentMondayState.task.trim()) {
    agentMondayState.route = buildAgentMondayRoutingRequest();
  }
  renderAgentMondayPanel();
}

async function refreshCliHealth(force = false): Promise<void> {
  const requestId = ++cliHealthRequestSeq;
  const cli = window.agentgridCli;
  cliHealthState.bridgeAvailable = Boolean(cli);
  cliHealthState.checkError = null;
  cliHealthState.actionError = null;

  if (!cli) {
    cliHealthState.isChecking = false;
    cliHealthState.results = Object.fromEntries(
      CLI_HEALTH_KINDS.map((kind) => [
        kind,
        makeCliHealthResult(kind, 'unknown', { reason: 'CLI preload bridge is not loaded.' }),
      ]),
    ) as Partial<Record<CliKind, CliDetectionResult>>;
    renderCliHealth();
    return;
  }

  cliHealthState.isChecking = true;
  cliHealthState.results = Object.fromEntries(
    CLI_HEALTH_KINDS.map((kind) => [kind, makeCliHealthResult(kind, 'checking')]),
  ) as Partial<Record<CliKind, CliDetectionResult>>;
  renderCliHealth();

  try {
    const results = await cli.detectAll({ force });
    if (requestId !== cliHealthRequestSeq) return;
    const nextResults = Object.fromEntries(
      CLI_HEALTH_KINDS.map((kind) => [kind, makeCliHealthResult(kind, 'unknown')]),
    ) as Partial<Record<CliKind, CliDetectionResult>>;
    if (Array.isArray(results)) {
      for (const result of results) {
        if (CLI_HEALTH_KINDS.includes(result.kind)) {
          nextResults[result.kind] = result;
        }
      }
    }
    cliHealthState.results = nextResults;
    cliHealthState.isChecking = false;
    renderCliHealth();
    renderSettings();
  } catch (err) {
    if (requestId !== cliHealthRequestSeq) return;
    console.warn('[launcher] CLI health check failed', err);
    cliHealthState.isChecking = false;
    cliHealthState.checkError = err instanceof Error ? err.message : 'CLI detection failed.';
    cliHealthState.results = Object.fromEntries(
      CLI_HEALTH_KINDS.map((kind) => [
        kind,
        makeCliHealthResult(kind, 'unknown', { reason: 'Detection failed. Check again.' }),
      ]),
    ) as Partial<Record<CliKind, CliDetectionResult>>;
    renderCliHealth();
  }
}

async function openCliInstall(kind: CliKind): Promise<void> {
  const cli = window.agentgridCli;
  if (!cli) {
    cliHealthState.actionError = 'CLI bridge unavailable; install helper cannot open.';
    renderCliHealth();
    return;
  }

  cliHealthState.actionError = null;
  renderCliHealth();
  try {
    await cli.openInstall(kind);
  } catch (err) {
    console.warn('[launcher] CLI install helper failed', err);
    cliHealthState.actionError = `Could not open ${CLI_HEALTH_LABELS[kind]} install helper.`;
    renderCliHealth();
  }
}

// â”€â”€â”€ Header / status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function bindCliInstallCompletionListener(): void {
  const cli = window.agentgridCli;
  if (!cli) return;
  cli.onInstallCompleted((evt) => {
    cliHealthState.actionError = null;
    if (evt.detection) {
      cliHealthState.results[evt.kind] = evt.detection;
      cliHealthState.isChecking = false;
      renderCliHealth();
      renderSettings();
    }
    void refreshCliHealth(true);
  });
}

type AgentMondayRouteStatus = 'draft' | 'ready' | 'blocked' | 'pending_integration';

interface AgentMondayState {
  task: string;
  status: AgentMondayRouteStatus;
  message: string;
  route: AgentMondayRoutePlan | null;
}

const agentMondayState: AgentMondayState = {
  task: '',
  status: 'draft',
  message: 'Waiting for task input.',
  route: null,
};

let agentMondayWorkspaceId: string | null = null;

function currentCliDetections(): CliDetectionResult[] {
  return CLI_HEALTH_KINDS.map((kind) => (
    cliHealthState.results[kind] ?? makeCliHealthResult(kind, 'unknown')
  ));
}

function buildAgentMondayRoutingRequest(): AgentMondayRoutePlan {
  return buildAgentMondayRoutePlan(
    agentMondayState.task,
    launcherDraft.projectFolder,
    currentCliDetections(),
  );
}

function dispatchAgentMondayHook(name: 'plan-requested' | 'launch-requested', route: AgentMondayRoutePlan): void {
  window.dispatchEvent(new CustomEvent(`agentgrid:agent-monday-${name}`, {
    detail: {
      route,
      launcherDraft: {
        paneCount: launcherDraft.paneCount,
        assignments: [...launcherDraft.assignments],
        projectFolder: launcherDraft.projectFolder,
      },
      cliHealth: {
        bridgeAvailable: cliHealthState.bridgeAvailable,
        isChecking: cliHealthState.isChecking,
        results: { ...cliHealthState.results },
      },
    },
  }));
}

function planAgentMondayRoute(): void {
  if (!agentMondayTaskEl) return;
  agentMondayState.task = agentMondayTaskEl!.value;
  const trimmedTask = agentMondayState.task.trim();
  if (!trimmedTask) {
    agentMondayState.status = 'blocked';
    agentMondayState.message = 'Enter a task before planning agents.';
    agentMondayState.route = null;
    renderAgentMondayPanel();
    return;
  }

  const route = buildAgentMondayRoutingRequest();
  agentMondayState.route = route;
  agentMondayState.status = route.status === 'ready' && route.selectedProjectFolder ? 'ready' : 'blocked';
  if (!route.selectedProjectFolder) {
    agentMondayState.message = 'Select a project folder before launching agents.';
  } else if (route.status === 'blocked' && cliHealthState.isChecking) {
    agentMondayState.message = 'CLI health check is still running. Plan again in a moment.';
  } else if (route.status === 'blocked') {
    agentMondayState.message = route.blockedReason ?? 'No installed CLI could be assigned to this task.';
  } else {
    agentMondayState.message = `Route ready: ${route.routes.map((item) => `${CLI_HEALTH_LABELS[item.cli]} ${item.role}`).join(', ')}.`;
  }
  dispatchAgentMondayHook('plan-requested', route);
  renderAgentMondayPanel();
}

async function launchAgentMondayRoute(): Promise<void> {
  if (!agentMondayState.route || agentMondayState.route.task !== agentMondayState.task.trim()) {
    planAgentMondayRoute();
  }

  const route = agentMondayState.route;
  if (!route) return;

  if (!route.selectedProjectFolder) {
    agentMondayState.status = 'blocked';
    agentMondayState.message = 'Select a project folder before launching agents.';
    renderAgentMondayPanel();
    return;
  }

  if (route.status !== 'ready' || route.routes.length === 0) {
    agentMondayState.status = 'blocked';
    agentMondayState.message = route.blockedReason ?? 'No installed CLI could be assigned to this task.';
    renderAgentMondayPanel();
    return;
  }

  const existingWorkspace = agentMondayWorkspaceId
    ? tabManager.getWorkspaceById(agentMondayWorkspaceId)
    : null;
  const isExplicitRoster = route.routes.some((item) => typeof item.requestedInstance === 'number');
  if (!isExplicitRoster && existingWorkspace?.canSatisfyAgentMondayRoutes(route.routes)) {
    tabManager.switchTo(existingWorkspace.id);
    existingWorkspace.injectAgentMondayPrompts(route.routes, { matchByCli: true });
    agentMondayState.status = 'pending_integration';
    agentMondayState.message = `Assigned this task to ${route.routes.length} existing Agent Monday pane${route.routes.length === 1 ? '' : 's'}.`;
    dispatchAgentMondayHook('launch-requested', route);
    renderAgentMondayPanel();
    return;
  }

  const paneCount = clampPaneCount(route.routes.length, LAUNCHER_PANE_COUNT_MAX);
  const assignments = route.routes.map((item) => item.cli as PaneAssignment);
  const tab = tabManager.openWorkspaceTab({
    paneCount,
    assignments,
    cwd: route.selectedProjectFolder,
  });
  agentMondayWorkspaceId = tab.id;
  tab.injectAgentMondayPrompts(route.routes, { matchByCli: true });
  await recordWorkspaceLaunchConfig({
    folder: route.selectedProjectFolder,
    paneCount,
    bulkAssignment: assignments[0] ?? null,
    assignments,
    launchContext: 'native',
    launchedAt: Date.now(),
  });

  agentMondayState.status = 'pending_integration';
  agentMondayState.message = `Launched ${route.routes.length} supervised Agent Monday pane${route.routes.length === 1 ? '' : 's'}. Watch the terminals for sign-in and approval prompts.`;
  dispatchAgentMondayHook('launch-requested', route);
  renderAgentMondayPanel();
}

function renderAgentMondayRoutePreview(): void {
  agentMondayRoutePreviewEl!.replaceChildren();
  const route = agentMondayState.route;
  if (!route) {
    agentMondayRoutePreviewEl!.textContent = agentMondayState.task.trim()
      ? 'Choose Plan agents to preview routing.'
      : 'Add a task and choose Plan agents to preview routing.';
    return;
  }

  const meta = document.createElement('div');
  meta.className = 'agent-monday-route-meta';
  meta.textContent = route.selectedProjectFolder
    ? `${workspaceName(route.selectedProjectFolder)} | ${route.intent} | ${route.routes.length} agent${route.routes.length === 1 ? '' : 's'}`
    : `${route.intent} | folder required`;
  agentMondayRoutePreviewEl!.append(meta);

  if (route.status === 'blocked') {
    const blocked = document.createElement('div');
    blocked.className = 'agent-monday-route-blocked';
    blocked.textContent = route.blockedReason ?? 'Agent Monday cannot launch this route yet.';
    agentMondayRoutePreviewEl!.append(blocked);
    return;
  }

  const list = document.createElement('div');
  list.className = 'agent-monday-agent-list';
  for (const [index, agent] of route.routes.entries()) {
    const row = document.createElement('div');
    row.className = 'agent-monday-agent-row is-ready';

    const name = document.createElement('span');
    name.className = 'agent-monday-agent-name';
    name.textContent = `${index + 1}. ${CLI_HEALTH_LABELS[agent.cli]}`;

    const status = document.createElement('span');
    status.className = 'agent-monday-agent-status';
    status.textContent = agent.canWrite ? 'Writer' : agent.role;

    const detail = document.createElement('span');
    detail.className = 'agent-monday-agent-detail';
    detail.textContent = agent.reason;

    row.append(name, status, detail);
    list.append(row);
  }
  agentMondayRoutePreviewEl!.append(list);
}

function renderAgentMondaySetupGuidance(): void {
  const guidance: string[] = [];
  if (launcherDraft.projectFolder) {
    guidance.push(`Workspace: ${workspaceName(launcherDraft.projectFolder)}`);
  } else {
    guidance.push('Select a project folder so launched agents know the workspace cwd.');
  }

  const cliSummary = summarizeCliHealth();
  guidance.push(`CLI health: ${cliSummary.text}.`);

  const plannedClis = agentMondayState.route?.routes.map((route) => route.cli) ?? [];
  const missingClis = CLI_HEALTH_KINDS.filter((kind) => (cliHealthState.results[kind]?.status ?? 'unknown') !== 'available');
  if (plannedClis.length > 0) {
    guidance.push(`Planned CLIs: ${plannedClis.map((kind) => CLI_HEALTH_LABELS[kind]).join(', ')}.`);
    guidance.push('If a CLI asks for sign-in or approval, complete it in that terminal. Agent Monday does not use app API keys.');
  } else if (missingClis.length > 0 && !cliHealthState.isChecking) {
    guidance.push(`Install or repair at least one CLI: ${missingClis.map((kind) => CLI_HEALTH_LABELS[kind]).join(', ')}.`);
  } else {
    guidance.push('Plan agents to choose Codex, Claude Code, or Gemini from the installed local CLIs.');
  }

  agentMondaySetupGuidanceEl!.replaceChildren(...guidance.map((text) => {
    const item = document.createElement('div');
    item.textContent = text;
    return item;
  }));
}

function renderAgentMondayPanel(): void {
  if (
    !agentMondayTaskEl
    || !agentMondayStateEl
    || !agentMondayPlanButtonEl
    || !agentMondayLaunchButtonEl
    || !agentMondayRouteStatusEl
    || !agentMondayRoutePreviewEl
    || !agentMondaySetupGuidanceEl
  ) {
    return;
  }

  if (agentMondayTaskEl!.value !== agentMondayState.task) {
    agentMondayTaskEl!.value = agentMondayState.task;
  }

  const hasTask = agentMondayState.task.trim().length > 0;
  agentMondayStateEl!.textContent = agentMondayState.status === 'pending_integration'
    ? 'Launched'
    : agentMondayState.status === 'blocked'
      ? 'Needs input'
      : agentMondayState.status === 'ready'
        ? 'Planned'
        : 'Draft';
  agentMondayStateEl!.dataset.state = agentMondayState.status;
  agentMondayPlanButtonEl!.disabled = !hasTask;
  agentMondayLaunchButtonEl!.disabled = !hasTask || (
    Boolean(agentMondayState.route)
    && (agentMondayState.route?.status !== 'ready' || !agentMondayState.route.selectedProjectFolder)
  );
  agentMondayRouteStatusEl!.textContent = agentMondayState.message;
  agentMondayRouteStatusEl!.dataset.state = agentMondayState.status;
  renderAgentMondayRoutePreview();
  renderAgentMondaySetupGuidance();
}

function resetAgentMondayRouteForLauncherChange(message: string): void {
  agentMondayState.route = null;
  agentMondayState.status = 'draft';
  agentMondayState.message = agentMondayState.task.trim() ? message : 'Waiting for task input.';
}

function setStatus(text: string): void {
  if (statusEl) statusEl.textContent = text;
}

function updateHeaderStatus(): void {
  const active = tabManager.activeTab;
  if (active.kind === 'home') {
    const wsCount = tabManager.workspaceTabs.length;
    if (statusEl) statusEl.hidden = true;
    if (headerLaunchBtnEl) headerLaunchBtnEl.hidden = setupStep !== 2;
    setStatus(
      wsCount === 0
        ? 'Ready'
        : `Home | ${wsCount} workspace${wsCount === 1 ? '' : 's'} open`,
    );
    if (paneCountEl) paneCountEl.hidden = true;
    return;
  }
  if (headerLaunchBtnEl) headerLaunchBtnEl.hidden = true;
  const ws = active as WorkspaceTab;
  if (statusEl) statusEl.hidden = false;
  const total = ws.totalPaneCount;
  const running = ws.runningPaneCount;
  const errors = ws.errorPaneCount;
  const parts = [`${total} terminal${total === 1 ? '' : 's'}`, `${running} running`];
  if (errors > 0) parts.push(`${errors} failed`);
  setStatus(parts.join(' | '));
  if (paneCountEl) paneCountEl.hidden = false;
  renderWorkspaceAddControl(ws);
}

function renderWorkspaceAddControl(ws: WorkspaceTab): void {
  if (!paneCountEl) return;
  paneCountEl.replaceChildren();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'workspace-add-pane-button';
  button.textContent = '+';
  button.setAttribute('aria-label', 'New terminal');
  const isAtLimit = ws.paneCount >= WORKSPACE_PANE_COUNT_MAX;
  button.disabled = isAtLimit;
  button.title = isAtLimit
    ? `Workspace limit reached (${WORKSPACE_PANE_COUNT_MAX} terminals)`
    : `New terminal (${ws.paneCount}/${WORKSPACE_PANE_COUNT_MAX})`;
  button.addEventListener('click', () => {
    ws.addPane();
    updateHeaderStatus();
    tabManager.refreshIndicators();
  });
  enableButtonMotion(button);
  paneCountEl.append(button);
}

// Single notification point for "something workspace-shaped changed" â€” tab
// chrome (running counts etc.), header status, and Home shortcuts all read
// from the tab manager.
function onWorkspaceTabChromeChange(): void {
  updateHeaderStatus();
  tabManager.refreshIndicators();
}

// â”€â”€â”€ Home: launcher rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderProjectFolder(): void {
  const folder = launcherDraft.projectFolder;
  if (folder) {
    const label = workspaceName(folder);
    projectFolderPanelEl!.dataset.state = 'selected';
    projectFolderPathEl!.textContent = label;
    projectFolderPathEl!.title = folder;
    projectFolderHintEl!.textContent = 'Terminals will start in this folder.';
    projectFolderBrowseEl!.textContent = 'Switch folder\u2026';
    if (headerProjectFolderEl) {
      headerProjectFolderEl.textContent = label;
      headerProjectFolderEl.title = folder;
    }
  } else {
    projectFolderPanelEl!.dataset.state = 'empty';
    projectFolderPathEl!.textContent = 'No folder yet';
    projectFolderPathEl!.title = '';
    projectFolderHintEl!.textContent = 'Select a project folder before launching.';
    projectFolderBrowseEl!.textContent = 'Select folder\u2026';
    if (headerProjectFolderEl) {
      headerProjectFolderEl.textContent = 'No folder selected';
      headerProjectFolderEl.title = '';
    }
  }
  // Gate Next and Launch on folder presence
  const hasFolder = !!folder;
  if (setupNextBtnEl) {
    setupNextBtnEl.disabled = !hasFolder;
    setupNextBtnEl.title = hasFolder ? '' : 'Select a folder first';
  }
  if (setupLaunchBtnEl) {
    setupLaunchBtnEl.disabled = !hasFolder;
    setupLaunchBtnEl.title = hasFolder ? '' : 'Select a folder first';
  }
  renderAgentMondayPanel();
}

let projectFolderNoticeTimer = 0;
function showProjectFolderNotice(message: string): void {
  const footnote = projectFolderPanelEl!.querySelector('.project-folder-footnote');
  if (!(footnote instanceof HTMLElement)) return;
  const defaultText = launcherDraft.projectFolder
    ? 'Selected folder will be used as the working directory.'
    : 'Choose a folder to set the working directory for every terminal.';
  footnote.textContent = message;
  footnote.classList.add('transient');
  if (footnote instanceof HTMLElement) void conditionalEnter(footnote);
  if (projectFolderNoticeTimer) window.clearTimeout(projectFolderNoticeTimer);
  projectFolderNoticeTimer = window.setTimeout(() => {
    footnote.textContent = defaultText;
    footnote.classList.remove('transient');
    projectFolderNoticeTimer = 0;
  }, 3200);
}

projectFolderBrowseEl.addEventListener('click', () => {
  if (!window.agentgridFolders) {
    showProjectFolderNotice('Folder picker is unavailable because the preload bridge is not loaded.');
    return;
  }
  projectFolderBrowseEl!.disabled = true;
  const previousLabel = projectFolderBrowseEl!.textContent ?? 'Select folder\u2026';
  projectFolderBrowseEl!.textContent = 'Selecting\u2026';
  void window.agentgridFolders.selectProjectFolder()
    .then((result) => {
      if (result.canceled || !result.path) return;
      launcherDraft.projectFolder = result.path;
      resetAgentMondayRouteForLauncherChange('Project folder changed. Plan agents again to refresh the route preview.');
      renderProjectFolder();
      renderLaunchSummary();
      void persistLauncherDefaults().then(() => renderSettings());
      showProjectFolderNotice('Selected folder will be used as the working directory.');
    })
    .catch((err) => {
      console.warn('[launcher] folder selection failed', err);
      showProjectFolderNotice('Could not open the folder picker. Try again.');
    })
    .finally(() => {
      projectFolderBrowseEl!.disabled = false;
      if (!launcherDraft.projectFolder) {
        projectFolderBrowseEl!.textContent = previousLabel;
      } else {
        renderProjectFolder();
      }
    });
});

function renderLauncherPaneCount(): void {
  launcherPaneCountEl!.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'styled-select-wrap';
  const select = document.createElement('select');
  select.className = 'pane-count-select styled-select';
  select.setAttribute('aria-label', `Launch terminal count, maximum ${LAUNCHER_PANE_COUNT_MAX}`);
  for (let count = PANE_COUNT_MIN; count <= LAUNCHER_PANE_COUNT_MAX; count++) {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = `${count} terminal${count === 1 ? '' : 's'}`;
    option.selected = count === launcherDraft.paneCount;
    select.append(option);
  }
  select.addEventListener('change', () => {
    launcherDraft.paneCount = clampPaneCount(select.value, LAUNCHER_PANE_COUNT_MAX);
    ensureAssignmentsLength(launcherDraft);
    resetAgentMondayRouteForLauncherChange('Pane layout changed. Plan agents again to refresh the route preview.');
    renderLauncherPaneCount();
    renderLauncherBulkAgent();
    renderLauncherAssignments();
    renderAgentMondayPanel();
    renderLaunchSummary();
    void persistLauncherDefaults();
  });
  wrap.append(select);
  launcherPaneCountEl!.append(wrap);
}

function launcherAssignmentStatus(assignment: PaneAssignment): { label: string; className: string } {
  if (assignment === 'shell') return { label: 'Ready', className: 'ready' };
  const result = cliHealthState.results[assignment as CliKind];
  if (cliHealthState.isChecking && result?.status === 'checking') {
    return { label: 'Checking', className: 'checking' };
  }
  if (result?.status === 'available') return { label: 'Installed', className: 'installed' };
  if (result?.status === 'missing' || result?.status === 'invocation_failed') {
    return { label: 'Missing', className: 'missing' };
  }
  return { label: 'Ready', className: 'ready' };
}

function launcherAssignmentDescription(assignment: PaneAssignment): string {
  return ASSIGNMENT_DESCRIPTIONS[assignment];
}

function renderLauncherBulkAgent(): void {
  launcherBulkAgentEl!.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'styled-select-wrap';
  const select = document.createElement('select');
  select.className = 'bulk-agent-select styled-select';
  select.setAttribute('aria-label', 'Universal agent: default CLI for all terminals');

  for (const assignment of ALL_ASSIGNMENTS) {
    const option = document.createElement('option');
    option.value = assignment;
    option.textContent = ASSIGNMENT_LABELS[assignment];
    select.append(option);
  }

  const currentBulk = launcherDraft.bulkAssignment ?? inferBulkAssignment(launcherDraft.assignments) ?? 'shell';
  launcherDraft.bulkAssignment = currentBulk;
  select.value = currentBulk;
  select.addEventListener('change', () => {
    const value = select.value as PaneAssignment;
    launcherDraft.bulkAssignment = value;
    launcherDraft.assignments = Array.from({ length: launcherDraft.paneCount }, () => value);
    resetAgentMondayRouteForLauncherChange('Pane tools changed. Plan agents again to refresh the route preview.');
    ensureAssignmentsLength(launcherDraft);
    renderLauncherBulkAgent();
    renderLauncherAssignments();
    renderAgentMondayPanel();
    renderLaunchSummary();
    void persistLauncherDefaults();
  });

  wrap.append(select);
  launcherBulkAgentEl!.append(wrap);
}

function renderWizardUniversalAgent(): void {
  if (!wizardUniversalAgentEl) return;
  wizardUniversalAgentEl.replaceChildren();

  const activeAssignments = launcherDraft.assignments.slice(0, launcherDraft.paneCount);
  const allSame = activeAssignments.length > 0 && activeAssignments.every((a) => a === activeAssignments[0]);
  const isMixed = !allSame && activeAssignments.length > 1;

  const label = document.createElement('span');
  label.className = 'wizard-universal-label';
  label.textContent = 'Apply to all';

  const wrap = document.createElement('div');
  wrap.className = 'wizard-universal-wrap';

  const select = document.createElement('select');
  select.className = 'wizard-universal-select';
  select.setAttribute('aria-label', 'Apply same agent to all terminals');

  if (isMixed) {
    const mixedOpt = document.createElement('option');
    mixedOpt.value = '';
    mixedOpt.textContent = '— Mixed —';
    select.append(mixedOpt);
  }

  for (const assignment of ALL_ASSIGNMENTS) {
    const option = document.createElement('option');
    option.value = assignment;
    option.textContent = ASSIGNMENT_LABELS[assignment];
    select.append(option);
  }

  select.value = isMixed ? '' : (activeAssignments[0] ?? 'shell');

  select.addEventListener('change', () => {
    const value = select.value as PaneAssignment;
    if (!value) return;
    launcherDraft.bulkAssignment = value;
    launcherDraft.assignments = Array.from({ length: launcherDraft.paneCount }, () => value);
    resetAgentMondayRouteForLauncherChange('Pane tools changed. Plan agents again to refresh the route preview.');
    renderLauncherAssignments();
    renderLaunchSummary();
    void persistLauncherDefaults();
  });

  wrap.append(select);
  wizardUniversalAgentEl.append(label, wrap);
}

function renderLauncherAssignments(): void {
  launcherAssignmentsEl!.replaceChildren();
  const g = WIZARD_TILE_GRIDS[launcherDraft.paneCount] ?? { cols: 2, rows: Math.ceil(launcherDraft.paneCount / 2) };
  launcherAssignmentsEl!.style.gridTemplateColumns = `repeat(${g.cols}, 1fr)`;

  for (let i = 0; i < launcherDraft.paneCount; i++) {
    const cell = document.createElement('div');
    cell.className = 'assign-cell';

    const label = document.createElement('div');
    label.className = 'assign-cell-label';
    label.textContent = `Terminal ${i + 1}`;

    const select = document.createElement('select');
    select.className = 'assign-cell-select';
    select.setAttribute('aria-label', `Terminal ${i + 1}: agent`);
    for (const assignment of ALL_ASSIGNMENTS) {
      const option = document.createElement('option');
      option.value = assignment;
      option.textContent = ASSIGNMENT_LABELS[assignment];
      if (assignment === (launcherDraft.assignments[i] ?? 'shell')) option.selected = true;
      select.append(option);
    }

    select.addEventListener('change', () => {
      launcherDraft.assignments[i] = select.value as PaneAssignment;
      renderWizardUniversalAgent();
      renderLaunchSummary();
      void persistLauncherDefaults();
    });

    cell.append(label, select);
    launcherAssignmentsEl!.append(cell);
    void fadeIn(cell, { y: MOTION_Y_SM, duration: ENTRANCE_DURATION_S, delay: i * 0.04 });
  }
  renderWizardUniversalAgent();
}

function renderOpenWorkspaces(): void {
  if (!openWorkspacesEl || !openWorkspacesListEl) return;

  const tabs = tabManager.workspaceTabs;
  if (tabs.length === 0) {
    openWorkspacesEl!.hidden = true;
    openWorkspacesListEl!.replaceChildren();
    return;
  }
  openWorkspacesEl!.hidden = false;
  void conditionalEnter(openWorkspacesEl!);
  openWorkspacesListEl!.replaceChildren();
  for (const [index, ws] of tabs.entries()) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'open-workspace-card';
    card.addEventListener('click', () => tabManager.switchTo(ws.id));
    enableCardMotion(card);

    const titleEl = document.createElement('span');
    titleEl.className = 'open-workspace-title';
    titleEl.textContent = ws.title;
    card.append(titleEl);

    const meta = document.createElement('span');
    meta.className = 'open-workspace-meta';
    const total = ws.totalPaneCount;
    const running = ws.runningPaneCount;
    meta.textContent = `${running}/${total} running`;
    if (running > 0) meta.classList.add('has-running');
    card.append(meta);

    const close = document.createElement('span');
    close.className = 'open-workspace-close';
    close.textContent = '\u00D7';
    close.title = 'Close workspace';
    close.setAttribute('role', 'button');
    close.setAttribute('aria-label', `Close ${ws.title}`);
    close.tabIndex = 0;
    enableButtonMotion(close);
    const closeWorkspace = (e: Event): void => {
      e.stopPropagation();
      e.preventDefault();
      void tabManager.closeTab(ws.id);
    };
    close.addEventListener('click', closeWorkspace);
    close.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') closeWorkspace(e);
    });
    card.append(close);

    openWorkspacesListEl!.append(card);
    void fadeIn(card, { y: MOTION_Y_SM, duration: ENTRANCE_DURATION_S, delay: index * 0.09 });
  }
}

function assignmentSummary(assignments: readonly PaneAssignment[]): string {
  return assignments.map((assignment) => ASSIGNMENT_LABELS[assignment] ?? assignment).join(', ');
}

function formatRecentTime(timestamp: number): string {
  if (!timestamp) return 'Never opened';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

async function openWorkspaceFromConfig(config: WorkspaceLaunchConfig | RecentWorkspaceEntry): Promise<void> {
  if (!window.agentgridPty) return;
  applyLaunchConfigToDraft(config);
  await tabManager.openWorkspaceTab({
    paneCount: launcherDraft.paneCount,
    assignments: [...launcherDraft.assignments],
    cwd: launcherDraft.projectFolder,
  });
  await recordWorkspaceLaunch();
}

function renderSidebarPresets(): void {
  if (!sidebarPresetsListEl) return;
  sidebarPresetsListEl.replaceChildren();
  const presets = appState.presets;
  if (presets.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'sidebar-presets-empty';
    empty.textContent = 'No presets yet.';
    sidebarPresetsListEl.append(empty);
    return;
  }
  for (const preset of presets) {
    const item = document.createElement('div');
    item.className = 'sidebar-preset-item';

    const name = document.createElement('span');
    name.className = 'sidebar-preset-item-name';
    name.textContent = preset.name;
    name.title = preset.name;

    const meta = document.createElement('span');
    meta.className = 'sidebar-preset-item-meta';
    meta.textContent = `${preset.paneCount} pane${preset.paneCount === 1 ? '' : 's'}`;

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'sidebar-preset-item-delete';
    del.textContent = '×';
    del.title = 'Delete preset';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      void deletePreset(preset.id);
    });

    item.append(name, meta, del);
    item.addEventListener('click', () => applyPreset(preset));
    sidebarPresetsListEl.append(item);
  }
}

function openPresetNameDialog(paneCount: number, assignments: string[]): void {
  if (!presetNameDialogEl || !presetNameInputEl) return;
  const defaultName = `Preset ${appState.presets.length + 1}`;
  presetNameInputEl.value = defaultName;

  const onSubmit = (): void => {
    const name = presetNameInputEl!.value.trim() || defaultName;
    void savePreset(name, paneCount as WorkspaceSettings['paneCount'], assignments as PaneAssignment[]);
  };

  presetNameDialogEl.onclose = () => {
    if (presetNameDialogEl!.returnValue === 'save') onSubmit();
  };

  presetNameDialogEl.showModal();
  presetNameInputEl.select();
}

async function savePreset(name: string, paneCount: WorkspaceSettings['paneCount'], assignments: PaneAssignment[]): Promise<void> {
  const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const preset: WorkspacePreset = { id, name, paneCount, assignments, createdAt: Date.now() };
  const next = [...appState.presets, preset];
  await patchAppState({ presets: next });
  renderSidebarPresets();
}

async function deletePreset(id: string): Promise<void> {
  const next = appState.presets.filter((p) => p.id !== id);
  await patchAppState({ presets: next });
  renderSidebarPresets();
}

function applyPreset(preset: WorkspacePreset): void {
  if (!window.agentgridPty) return;
  void tabManager.openWorkspaceTab({
    paneCount: preset.paneCount,
    assignments: [...preset.assignments] as PaneAssignment[],
    cwd: launcherDraft.projectFolder,
  });
}

function renderRecentWorkspaces(): void {
  if (!recentWorkspacesEl || !recentWorkspacesListEl) return;

  const recent = appState.recentWorkspaces;
  if (recent.length === 0) {
    recentWorkspacesEl!.hidden = true;
    recentWorkspacesListEl!.replaceChildren();
    return;
  }

  recentWorkspacesEl!.hidden = false;
  recentWorkspacesListEl!.replaceChildren();
  for (const [index, entry] of recent.entries()) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'recent-workspace-card';
    card.title = entry.folder;
    card.addEventListener('click', () => {
      void openWorkspaceFromConfig(entry).catch((err) => {
        console.warn('[launcher] failed to reopen recent workspace', err);
      });
    });
    enableCardMotion(card);

    const title = document.createElement('span');
    title.className = 'recent-workspace-title';
    title.textContent = entry.name || workspaceName(entry.folder);

    const meta = document.createElement('span');
    meta.className = 'recent-workspace-meta';
    meta.textContent = `${entry.paneCount} terminal${entry.paneCount === 1 ? '' : 's'} - ${assignmentSummary(entry.assignments)}`;

    const time = document.createElement('span');
    time.className = 'recent-workspace-time';
    time.textContent = formatRecentTime(entry.lastLaunchedAt);

    const remove = document.createElement('span');
    remove.className = 'recent-workspace-remove';
    remove.textContent = '\u00D7';
    remove.title = 'Remove recent workspace';
    remove.setAttribute('role', 'button');
    remove.setAttribute('aria-label', `Remove ${entry.name}`);
    remove.tabIndex = 0;
    const removeEntry = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();
      const next = appState.recentWorkspaces.filter((item) => item.folder !== entry.folder);
      void patchAppState({ recentWorkspaces: next }).then(() => renderRecentWorkspaces());
    };
    remove.addEventListener('click', removeEntry);
    remove.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') removeEntry(event);
    });

    card.append(title, meta, time, remove);
    recentWorkspacesListEl!.append(card);
    void fadeIn(card, { y: MOTION_Y_SM, duration: 0.28, delay: index * 0.05 });
  }
}

function renderSettings(): void {
  settingsFontSizeEl!.value = String(terminalSettings.fontSize);
  settingsFontFamilyEl!.value = terminalSettings.fontFamily;
  settingsCopyOnSelectEl!.checked = terminalSettings.copyOnSelect;
  settingsPasteConfirmEl!.checked = terminalSettings.pasteConfirmForLargeText;
  settingsDefaultFolderEl!.textContent = launcherDraft.projectFolder ?? 'No folder selected';
  settingsDefaultFolderEl!.title = launcherDraft.projectFolder ?? '';

  settingsCliPathsListEl!.replaceChildren();
  for (const kind of CLI_HEALTH_KINDS) {
    const result = cliHealthState.results[kind];
    const row = document.createElement('div');
    row.className = 'settings-cli-path-row';
    const name = document.createElement('span');
    name.textContent = CLI_HEALTH_LABELS[kind];
    const value = document.createElement('strong');
    value.textContent = result?.path ?? cliHealthStatusText(result?.status ?? 'unknown');
    value.title = result?.path ?? result?.reason ?? '';
    row.append(name, value);
    settingsCliPathsListEl!.append(row);
  }
}

let settingsOpener: HTMLElement | null = null;

function openSettingsPanel(): void {
  settingsOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  renderSettings();
  tabManager.setBrowserPreviewsSuppressed(true);
  settingsPanelEl!.hidden = false;
  settingsButtonEl!.setAttribute('aria-expanded', 'true');
  settingsFontSizeEl!.focus();
  void conditionalEnter(settingsPanelEl!);
}

function closeSettingsPanel(): void {
  settingsPanelEl!.hidden = true;
  tabManager.setBrowserPreviewsSuppressed(false);
  settingsButtonEl!.setAttribute('aria-expanded', 'false');
  (settingsOpener ?? settingsButtonEl)?.focus();
  settingsOpener = null;
}

function readSettingsForm(): TerminalSettings {
  return {
    fontSize: Math.min(40, Math.max(8, Math.round(Number(settingsFontSizeEl!.value) || DEFAULT_FONT_SIZE))),
    fontFamily: settingsFontFamilyEl!.value.trim() || DEFAULT_FONT_FAMILY,
    copyOnSelect: settingsCopyOnSelectEl!.checked,
    pasteConfirmForLargeText: settingsPasteConfirmEl!.checked,
  };
}

function persistSettingsFromForm(): void {
  terminalSettings = readSettingsForm();
  void patchAppState({ terminalSettings }).then(() => renderSettings());
}

function renderLaunchSummary(): void {
  if (!launchSummaryPanelEl) return;
  if (summaryWorkspaceEl) {
    summaryWorkspaceEl.textContent = launcherDraft.projectFolder
      ? workspaceName(launcherDraft.projectFolder)
      : 'No folder selected';
  }
  if (summaryTerminalCountEl) {
    const n = launcherDraft.paneCount;
    summaryTerminalCountEl.textContent = `${n} terminal${n === 1 ? '' : 's'}`;
  }
  if (summaryUniversalAgentEl) {
    summaryUniversalAgentEl.textContent = ASSIGNMENT_LABELS[launcherDraft.bulkAssignment ?? 'shell'];
  }
  if (summaryAgentsListEl) {
    summaryAgentsListEl.replaceChildren();
    for (const a of launcherDraft.assignments) {
      const chip = document.createElement('span');
      chip.className = 'summary-agent-chip';
      chip.textContent = ASSIGNMENT_LABELS[a];
      summaryAgentsListEl.append(chip);
    }
  }
  if (summaryLaunchBtnEl) {
    summaryLaunchBtnEl.disabled = !window.agentgridPty;
    summaryLaunchBtnEl.title = summaryLaunchBtnEl.disabled ? 'Terminal bridge unavailable' : 'Launch the selected workspace';
  }
  if (headerLaunchBtnEl) {
    const noPty = !window.agentgridPty;
    const noFolder = !launcherDraft.projectFolder;
    headerLaunchBtnEl.disabled = noPty || noFolder;
    headerLaunchBtnEl.title = noPty ? 'Terminal bridge unavailable' : noFolder ? 'Select a folder first' : 'Start a new workspace';
  }
}

const WIZARD_TILE_COUNTS = [1, 2, 4, 6, 8, 10, 12] as const;
const WIZARD_TILE_GRIDS: Record<number, { cols: number; rows: number }> = {
  1: { cols: 1, rows: 1 }, 2: { cols: 2, rows: 1 }, 4: { cols: 2, rows: 2 },
  6: { cols: 3, rows: 2 }, 8: { cols: 4, rows: 2 }, 10: { cols: 5, rows: 2 }, 12: { cols: 4, rows: 3 },
};

function wizardTileGridLabel(n: number): string {
  const g = WIZARD_TILE_GRIDS[n];
  return g ? `${g.cols}×${g.rows}` : `${n}`;
}

function renderWizardTiles(): void {
  if (!wizardTileGridEl) return;
  wizardTileGridEl.replaceChildren();
  for (const count of WIZARD_TILE_COUNTS) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'wizard-tile' + (count === launcherDraft.paneCount ? ' selected' : '');
    tile.setAttribute('aria-label', `${count} terminal${count === 1 ? '' : 's'}`);
    tile.addEventListener('click', () => {
      launcherDraft.paneCount = count;
      ensureAssignmentsLength(launcherDraft);
      resetAgentMondayRouteForLauncherChange('Pane layout changed. Plan agents again to refresh the route preview.');
      renderWizardTiles();
      renderWizardBadge();
      renderLauncherAssignments();
      renderLaunchSummary();
      void persistLauncherDefaults();
    });

    // Dot grid preview
    const dots = document.createElement('div');
    dots.className = 'wizard-tile-dots';
    const g = WIZARD_TILE_GRIDS[count] ?? { cols: 2, rows: 2 };
    const total = g.cols * g.rows;
    for (let i = 0; i < Math.min(total, 12); i++) {
      const d = document.createElement('span');
      d.className = 'wizard-tile-dot';
      dots.append(d);
    }
    dots.style.gridTemplateColumns = `repeat(${g.cols}, 5px)`;
    dots.style.gridTemplateRows = `repeat(${g.rows}, 5px)`;

    const label = document.createElement('span');
    label.className = 'wizard-tile-label';
    label.textContent = String(count);

    tile.append(dots, label);
    wizardTileGridEl.append(tile);
  }

  renderWizardBadge();
}

function renderWizardBadge(): void {
  if (!wizardTerminalsBadgeEl) return;
  const n = launcherDraft.paneCount;
  const grid = wizardTileGridLabel(n);
  wizardTerminalsBadgeEl.textContent = `${n} terminal${n === 1 ? '' : 's'} · ${grid} grid`;
}

function renderLauncher(): void {
  ensureAssignmentsLength(launcherDraft);
  renderProjectFolder();
  renderLauncherPaneCount();
  renderLauncherBulkAgent();
  renderLauncherAssignments();
  renderCliHealth();
  renderRecentWorkspaces();
  renderSettings();
  renderAgentMondayPanel();
  renderLaunchSummary();
  renderWizardTiles();
  updateHeaderStatus();
}

/** Chrome entrance when the workspace shell becomes visible. */
function runHomeChromeEntranceAnimations(): void {
  void fadeIn(homePanelEl!, { y: MOTION_Y_MD, duration: 0.28, delay: 0.05 });
  const panel = document.querySelector('.launcher-panel');
  if (panel instanceof HTMLElement) {
    void fadeIn(panel, { y: MOTION_Y_SM, duration: 0.3, delay: 0.08 });
  }
}

async function loadPersistedAppState(): Promise<void> {
  const bridge = window.agentgridAppState;
  if (!bridge) {
    applyLoadedAppState(cloneAppState(DEFAULT_APP_STATE));
    return;
  }
  try {
    applyLoadedAppState(await bridge.load());
  } catch (err) {
    console.warn('[app-state] load failed', err);
    applyLoadedAppState(cloneAppState(DEFAULT_APP_STATE));
  }
}

// â”€â”€â”€ Bootstrap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

bindStaticMotionControls();
startHomeBackgroundMotion();
bindCliInstallCompletionListener();

const homeTab: HomeTab = {
  id: 'home',
  kind: 'home',
  title: 'Home',
  panelEl: homePanelEl,
  tabButtonEl: null,
};

const tabManager = new TabManager(homeTab);

sidebarHomeBtnEl.addEventListener('click', () => {
  tabManager.switchTo(tabManager.homeId);
});

sidebarToggleBtnEl?.addEventListener('click', () => {
  const isCollapsed = mainAppEl!.dataset.sidebar === 'collapsed';
  const next = isCollapsed ? 'expanded' : 'collapsed';
  mainAppEl!.dataset.sidebar = next;
  appSidebarEl?.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
  if (sidebarToggleBtnEl) {
    sidebarToggleBtnEl.title = isCollapsed ? 'Collapse sidebar' : 'Expand sidebar';
    sidebarToggleBtnEl.ariaLabel = isCollapsed ? 'Collapse sidebar' : 'Expand sidebar';
  }
});

settingsButtonEl.addEventListener('click', () => {
  if (settingsPanelEl!.hidden) openSettingsPanel();
  else closeSettingsPanel();
});

document.querySelectorAll('.debug-inline-button').forEach((button) => {
  button.addEventListener('click', () => openSettingsPanel());
});

settingsCloseEl.addEventListener('click', closeSettingsPanel);
settingsPanelEl.addEventListener('click', (event) => {
  if (event.target === settingsPanelEl) closeSettingsPanel();
});
settingsFontSizeEl.addEventListener('change', persistSettingsFromForm);
settingsFontFamilyEl.addEventListener('change', persistSettingsFromForm);
settingsCopyOnSelectEl.addEventListener('change', persistSettingsFromForm);
settingsPasteConfirmEl.addEventListener('change', persistSettingsFromForm);

if (agentMondayTaskEl && agentMondayPlanButtonEl && agentMondayLaunchButtonEl) {
  agentMondayTaskEl.addEventListener('input', () => {
    agentMondayState.task = agentMondayTaskEl.value;
    agentMondayState.route = null;
    agentMondayState.status = 'draft';
    agentMondayState.message = agentMondayState.task.trim()
      ? 'Task changed. Plan agents to build a route preview.'
      : 'Waiting for task input.';
    renderAgentMondayPanel();
  });

  agentMondayPlanButtonEl.addEventListener('click', planAgentMondayRoute);
  agentMondayLaunchButtonEl.addEventListener('click', () => {
    void launchAgentMondayRoute();
  });
}

recentWorkspacesClearEl?.addEventListener('click', () => {
  void patchAppState({ recentWorkspaces: [] }).then(() => renderRecentWorkspaces());
});

sidebarPresetsBtnEl?.addEventListener('click', () => {
  if (!sidebarPresetsListEl) return;
  const isHidden = sidebarPresetsListEl.hidden;
  sidebarPresetsListEl.hidden = !isHidden;
  sidebarPresetsBtnEl!.classList.toggle('active', isHidden);
  if (isHidden) renderSidebarPresets();
});

presetNameCancelEl?.addEventListener('click', () => {
  presetNameDialogEl?.close('');
});

presetNameDialogEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    presetNameDialogEl!.close('save');
  }
});

presetNameDialogEl?.querySelector('form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  presetNameDialogEl!.close('save');
});

function openInstallInstructions(): void {
  installInstructionsDialogEl?.showModal();
}

installNoticeBtnEl?.addEventListener('click', openInstallInstructions);
sidebarInstallBtnEl?.addEventListener('click', openInstallInstructions);

installInstructionsCloseEl?.addEventListener('click', () => {
  installInstructionsDialogEl?.close();
});

installInstructionsDialogEl?.addEventListener('click', (e) => {
  if (e.target === installInstructionsDialogEl) installInstructionsDialogEl.close();
});

installInstructionsDialogEl?.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.install-copy-btn');
  if (!btn) return;
  const targetId = btn.dataset.target;
  if (!targetId) return;
  const cmdEl = document.getElementById(targetId);
  if (!cmdEl) return;
  void navigator.clipboard.writeText(cmdEl.textContent ?? '').then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  });
});

function goToSetupStep(step: 1 | 2): void {
  setupStep = step;
  if (setupPane1El) setupPane1El.hidden = step !== 1;
  if (setupPane2El) setupPane2El.hidden = step !== 2;
  if (headerLaunchBtnEl) headerLaunchBtnEl.hidden = step !== 2;

  // Update stepper
  ssItem1El?.classList.toggle('active', step === 1);
  ssItem1El?.classList.toggle('completed', step > 1);
  if (ssCircle1El) ssCircle1El.textContent = step > 1 ? '✓' : '1';
  ssItem2El?.classList.toggle('active', step === 2);
  ssLine1El?.classList.toggle('completed', step > 1);

  if (step === 2) {
    launcherDraft.assignments = Array.from({ length: launcherDraft.paneCount }, (_, i) =>
      launcherDraft.assignments[i] ?? 'shell'
    );
    launcherDraft.bulkAssignment = inferBulkAssignment(launcherDraft.assignments) ?? launcherDraft.bulkAssignment ?? 'shell';
    renderLauncherAssignments();
  }

  const homePanel = document.getElementById('home-panel');
  homePanel?.scrollTo({ top: 0, behavior: 'smooth' });
}

setupNextBtnEl?.addEventListener('click', () => goToSetupStep(2));
setupBackBtnEl?.addEventListener('click', () => goToSetupStep(1));
setupLaunchBtnEl?.addEventListener('click', () => doLaunchWorkspace());

headerLaunchBtnEl?.addEventListener('click', () => {
  doLaunchWorkspace();
});

wizardSavePresetBtnEl?.addEventListener('click', () => {
  const snapshot = { paneCount: launcherDraft.paneCount, assignments: [...launcherDraft.assignments] };
  openPresetNameDialog(snapshot.paneCount, snapshot.assignments);
});

function doLaunchWorkspace(): void {
  if (!window.agentgridPty) return;
  if (!launcherDraft.projectFolder) {
    goToSetupStep(1);
    showProjectFolderNotice('Select a project folder before launching.');
    return;
  }
  ensureAssignmentsLength(launcherDraft);
  void (async () => {
    await tabManager.openWorkspaceTab({
      paneCount: launcherDraft.paneCount,
      assignments: [...launcherDraft.assignments],
      cwd: launcherDraft.projectFolder,
    });
    await recordWorkspaceLaunch();
    goToSetupStep(1);
  })().catch((err) => {
    console.warn('[launcher] launch failed', err);
  });
}


summaryLaunchBtnEl?.addEventListener('click', () => {
  doLaunchWorkspace();
});


// Settings focus trap
settingsPanelEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeSettingsPanel(); return; }
  if (e.key !== 'Tab') return;
  const focusable = Array.from(
    settingsPanelEl!.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter((el) => !el.hasAttribute('disabled'));
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

// Ctrl/Cmd+W closes the active workspace tab; never closes Home.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !settingsPanelEl!.hidden) { closeSettingsPanel(); return; }
  const isMod = e.ctrlKey || e.metaKey;
  if (!isMod) return;
  const key = e.key.toLowerCase();
  if (key === 'w') {
    e.preventDefault();
    tabManager.closeActiveWorkspace();
  } else if (key === 'n') {
    e.preventDefault();
    doLaunchWorkspace();
  } else if (key === 'tab') {
    e.preventDefault();
    tabManager.switchByOffset(e.shiftKey ? -1 : 1);
  } else if (key === 'h') {
    e.preventDefault();
    tabManager.switchTo(tabManager.homeId);
  } else if (key === 'p' && e.shiftKey) {
    e.preventDefault();
    tabManager.focusNextPane(1);
  } else if (key === '+' || key === '=') {
    const active = tabManager.activeTab;
    if (active.kind === 'workspace' && active.paneCount < WORKSPACE_PANE_COUNT_MAX) {
      e.preventDefault();
      active.setPaneCount(active.paneCount + 1);
    }
  } else if (key === '-' || key === '_') {
    const active = tabManager.activeTab;
    if (active.kind === 'workspace' && active.paneCount > PANE_COUNT_MIN) {
      e.preventDefault();
      active.setPaneCount(active.paneCount - 1);
    }
  } else if (key === ',' || key === '.') {
    e.preventDefault();
    if (settingsPanelEl!.hidden) openSettingsPanel();
    else closeSettingsPanel();
  }
});

window.addEventListener('beforeunload', () => {
  // Detach DOM/xterm + IPC listeners only. PTY teardown is owned by the main
  // process `before-quit` handler, which awaits node-pty's Windows conout
  // drain before Electron exits.
  for (const ws of tabManager.workspaceTabs) {
    ws.disposeForShutdown();
  }
});

void (async () => {
  await loadPersistedAppState();
  renderLauncher();
  renderSidebarPresets();
  void refreshCliHealth();

  if (!window.agentgridPty) {
    setStatus('bridge unavailable');
  }
  runHomeChromeEntranceAnimations();
})();
