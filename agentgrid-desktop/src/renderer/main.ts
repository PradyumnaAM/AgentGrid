import { Terminal } from 'xterm';
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
import type { AuthStatus } from '../shared/ipc';

// ─── DOM lookup ─────────────────────────────────────────────────────────────

const statusEl = document.getElementById('status') as HTMLSpanElement | null;
const accountButtonEl = document.getElementById('account-button') as HTMLButtonElement | null;
const tabBarEl = document.getElementById('app-tabs') as HTMLElement | null;
const tabViewsEl = document.getElementById('tab-views') as HTMLElement | null;
const workspaceMountEl = document.getElementById('workspace-mount') as HTMLElement | null;
const homePanelEl = document.getElementById('home-panel') as HTMLElement | null;
const paneCountEl = document.getElementById('pane-count') as HTMLElement | null;

// Home / launcher elements (single instance; the Home tab is unique)
const launcherEl = document.getElementById('launcher') as HTMLElement | null;
const launcherPaneCountEl = document.getElementById('launcher-pane-count') as HTMLElement | null;
const launcherAssignmentsEl = document.getElementById('launcher-assignments') as HTMLElement | null;
const projectFolderPanelEl = document.getElementById('project-folder-panel') as HTMLElement | null;
const projectFolderPathEl = document.getElementById('project-folder-path') as HTMLElement | null;
const projectFolderHintEl = document.getElementById('project-folder-hint') as HTMLElement | null;
const projectFolderBrowseEl = document.getElementById('project-folder-browse') as HTMLButtonElement | null;
const launchButtonEl = document.getElementById('launch-button') as HTMLButtonElement | null;
const openWorkspacesEl = document.getElementById('open-workspaces') as HTMLElement | null;
const openWorkspacesListEl = document.getElementById('open-workspaces-list') as HTMLElement | null;

if (!tabBarEl) throw new Error('app-tabs element missing');
if (!tabViewsEl) throw new Error('tab-views element missing');
if (!workspaceMountEl) throw new Error('workspace-mount element missing');
if (!homePanelEl) throw new Error('home-panel element missing');
if (!paneCountEl) throw new Error('pane-count element missing');
if (!launcherEl) throw new Error('launcher element missing');
if (!launcherPaneCountEl) throw new Error('launcher-pane-count element missing');
if (!launcherAssignmentsEl) throw new Error('launcher-assignments element missing');
if (!launchButtonEl) throw new Error('launch-button element missing');
if (!projectFolderPanelEl) throw new Error('project-folder-panel element missing');
if (!projectFolderPathEl) throw new Error('project-folder-path element missing');
if (!projectFolderHintEl) throw new Error('project-folder-hint element missing');
if (!projectFolderBrowseEl) throw new Error('project-folder-browse element missing');
if (!openWorkspacesEl) throw new Error('open-workspaces element missing');
if (!openWorkspacesListEl) throw new Error('open-workspaces-list element missing');

const mainAppEl = document.getElementById('main-app') as HTMLElement | null;
const authOverlayEl = document.getElementById('auth-overlay') as HTMLElement | null;
const authGoogleBtn = document.getElementById('auth-google-btn') as HTMLButtonElement | null;
const authEmailForm = document.getElementById('auth-email-form') as HTMLFormElement | null;
const authStatusEl = document.getElementById('auth-status') as HTMLElement | null;
const authContinueLocalBtn = document.getElementById('auth-continue-local-btn') as HTMLButtonElement | null;

if (!mainAppEl) throw new Error('main-app element missing');

type PaneCount = 1 | 2 | 3 | 4 | 5 | 6;

const ASSIGNMENT_LABELS: Record<PaneAssignment, string> = {
  shell: 'Empty Terminal',
  codex: 'Codex',
  claude: 'Claude Code',
  gemini: 'Gemini',
};
const ALL_ASSIGNMENTS: PaneAssignment[] = ['shell', 'codex', 'claude', 'gemini'];

// Auto-typed into the shell shortly after PTY connects (newline = Enter).
const CLI_AUTOCOMMAND: Record<PaneAssignment, string | null> = {
  shell: null,
  codex: 'codex',
  claude: 'claude',
  gemini: 'gemini',
};

const AUTOCOMMAND_DELAY_MS = 350;

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

// ─── Motion presets ─────────────────────────────────────────────────────────
// Centralized so every transition has a consistent, premium feel and so
// motion can be tuned in one place if it ever feels too slow / too fast.

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

function fadeIn(el: HTMLElement, opts?: { y?: number; duration?: number; delay?: number }): AnimationPlaybackControlsWithThen {
  const y = opts?.y ?? MOTION_Y_SM;
  return animate(
    el,
    { opacity: [0, 1], transform: [translateY(y), translateYToken(MOTION_Y_ZERO)] },
    { duration: opts?.duration ?? 0.32, delay: opts?.delay ?? 0, ease: EASE_OUT },
  );
}

function fadeOut(el: HTMLElement, opts?: { y?: number; duration?: number }): AnimationPlaybackControlsWithThen {
  const y = opts?.y ?? -MOTION_Y_XS;
  return animate(
    el,
    { opacity: [1, 0], transform: [translateYToken(MOTION_Y_ZERO), translateY(y)] },
    { duration: opts?.duration ?? 0.18, ease: EASE_IN_OUT },
  );
}

// ─── Workspace state primitives (carried over, lightly tightened) ───────────

function createDefaultSettings(): WorkspaceSettings {
  return {
    paneCount: 1,
    defaultAssignment: 'shell',
    defaultCwd: '',
    fontSize: DEFAULT_FONT_SIZE,
    fontFamily: DEFAULT_FONT_FAMILY,
    copyOnSelect: false,
    pasteConfirmForLargeText: true,
  };
}

function createLayout(count: number): PaneLayoutMeta[] {
  if (count === 1) return [{ index: 0, row: 1, column: 1, rowSpan: 1, columnSpan: 1, isFocused: true }];
  if (count === 2) {
    return [
      { index: 0, row: 1, column: 1, rowSpan: 1, columnSpan: 1, isFocused: true },
      { index: 1, row: 1, column: 2, rowSpan: 1, columnSpan: 1, isFocused: false },
    ];
  }
  if (count === 3) {
    return [
      { index: 0, row: 1, column: 1, rowSpan: 2, columnSpan: 1, isFocused: true },
      { index: 1, row: 1, column: 2, rowSpan: 1, columnSpan: 1, isFocused: false },
      { index: 2, row: 2, column: 2, rowSpan: 1, columnSpan: 1, isFocused: false },
    ];
  }
  if (count === 4) {
    return Array.from({ length: 4 }, (_, index) => ({
      index,
      row: Math.floor(index / 2) + 1,
      column: (index % 2) + 1,
      rowSpan: 1,
      columnSpan: 1,
      isFocused: index === 0,
    }));
  }
  if (count === 5) {
    return [
      { index: 0, row: 1, column: 1, rowSpan: 1, columnSpan: 2, isFocused: true },
      { index: 1, row: 1, column: 3, rowSpan: 1, columnSpan: 2, isFocused: false },
      { index: 2, row: 1, column: 5, rowSpan: 1, columnSpan: 2, isFocused: false },
      { index: 3, row: 2, column: 1, rowSpan: 1, columnSpan: 3, isFocused: false },
      { index: 4, row: 2, column: 4, rowSpan: 1, columnSpan: 3, isFocused: false },
    ];
  }
  return Array.from({ length: 6 }, (_, index) => ({
    index,
    row: Math.floor(index / 3) + 1,
    column: (index % 3) + 1,
    rowSpan: 1,
    columnSpan: 1,
    isFocused: index === 0,
  }));
}

function applyWorkspaceGrid(workspaceEl: HTMLElement, count: number): void {
  if (count === 1) {
    workspaceEl.style.gridTemplateColumns = 'minmax(0, 1fr)';
    workspaceEl.style.gridTemplateRows = 'minmax(0, 1fr)';
    return;
  }
  if (count === 2) {
    workspaceEl.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    workspaceEl.style.gridTemplateRows = 'minmax(0, 1fr)';
    return;
  }
  if (count === 3 || count === 4) {
    workspaceEl.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    workspaceEl.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
    return;
  }
  if (count === 5) {
    workspaceEl.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
    workspaceEl.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
    return;
  }
  workspaceEl.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  workspaceEl.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
}

function formatStatus(pane: TerminalPaneState): string {
  if (pane.status === 'running') {
    return `Running · pid ${pane.processPid ?? '?'}`;
  }
  if (pane.status === 'starting') return 'Starting…';
  if (pane.status === 'restarting') return 'Restarting…';
  if (pane.status === 'exited') {
    const code = pane.exitState?.exitCode;
    const sig = pane.exitState?.signal;
    if (sig) return `Exited · ${sig}`;
    return code === 0 ? 'Exited · ok' : `Exited · code ${code ?? '?'}`;
  }
  if (pane.status === 'error') return 'Launch failed';
  return 'Idle';
}

function formatPaneChromeLine(pane: TerminalPaneState): string {
  const tool = ASSIGNMENT_LABELS[pane.assignment] ?? pane.assignment;
  if (pane.cwd) {
    return `${tool} · ${pane.cwd}`;
  }
  return tool;
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
    cols: 80,
    rows: 24,
    errorMessage: null,
  };
}

class WorkspaceStore {
  private state: WorkspaceState;
  // Monotonic pane ID counter — never reuse a slot's id even after close,
  // so in-flight teardown of an old `pane-2` cannot collide with a freshly
  // added `pane-2` from a pane-count bump.
  private paneSeq = 1;

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
    return `pane-${this.paneSeq++}`;
  }

  setPaneCount(count: PaneCount): { removed: TerminalPaneState[]; added: TerminalPaneState[] } {
    const oldPanes = this.state.panes;
    const layout = createLayout(count);
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
        id: this.freshPaneId(),
        title: ASSIGNMENT_LABELS.shell,
      };
    });
    const removed = oldPanes.slice(count);
    const added = nextPanes.filter((pane) => !oldPanes.some((old) => old.id === pane.id));
    const focusedStillExists = nextPanes.some((pane) => pane.id === this.state.focusedPaneId);
    const focusedPaneId = focusedStillExists ? this.state.focusedPaneId : nextPanes[0]?.id ?? null;
    this.state = {
      ...this.state,
      focusedPaneId,
      settings: { ...this.state.settings, paneCount: count },
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

    const count = remaining.length as PaneCount;
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

// ─── Pane controller (kept stable; only chrome-callback indirection is new) ─

interface TerminalPaneControllerCallbacks {
  onFocus: (id: string) => void;
  onRequestClose: (id: string) => void;
  onChromeChange: () => void;
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
    this.restartButton.textContent = 'Restart';
    this.restartButton.addEventListener('click', (event) => {
      event.stopPropagation();
      void this.restart();
    });

    this.killButton = document.createElement('button');
    this.killButton.type = 'button';
    this.killButton.className = 'pane-action';
    this.killButton.textContent = 'Kill';
    this.killButton.addEventListener('click', (event) => {
      event.stopPropagation();
      void this.kill();
    });

    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.className = 'pane-action pane-close';
    this.closeButton.textContent = '\u00D7';
    this.closeButton.title = 'Close pane';
    this.closeButton.setAttribute('aria-label', 'Close pane');
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
      scrollback: 5000,
    });

    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(this.terminalHost);

    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      this.term.loadAddon(webgl);
    } catch {
      // Canvas renderer remains available when WebGL is not.
    }

    this.term.onData((data) => {
      if (!this.ptyId || this.exited) return;
      void window.agentgridPty.write(this.ptyId, data);
    });

    this.root.addEventListener('pointerdown', () => {
      this.focus();
    });

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(this.terminalHost);
    window.addEventListener('resize', this.scheduleResize);

    this.update(this.pane);
  }

  mount(parent: HTMLElement): void {
    parent.append(this.root);
    // Tasteful entry animation — only the pane card, not its xterm canvas
    // (which gets its own opacity treatment via CSS to avoid flicker).
    void fadeIn(this.root, { y: MOTION_Y_MD, duration: 0.28 });
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
    title.textContent = 'Choose what to launch in this pane';
    overlay.append(title);

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
    void fadeIn(overlay, { y: MOTION_Y_XS, duration: 0.22 });
  }

  update(pane: TerminalPaneState): void {
    this.pane = pane;
    const layout = pane.layout;
    this.root.style.gridRow = `${layout.row} / span ${layout.rowSpan}`;
    this.root.style.gridColumn = `${layout.column} / span ${layout.columnSpan}`;
    this.root.classList.toggle('focused', layout.isFocused);
    this.statusEl.textContent = formatStatus(pane);
    this.statusEl.className = `pane-status ${pane.status}`;
    this.statusEl.title = pane.errorMessage ?? '';
    this.chromeLineEl.textContent = formatPaneChromeLine(pane);
    this.chromeLineEl.title = pane.cwd
      ? `${ASSIGNMENT_LABELS[pane.assignment]} — ${pane.cwd}`
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

  async spawn(restarting = false): Promise<void> {
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
    // (if any) is then auto-typed into that shell — so detection failures
    // surface as the shell's own "command not found" message rather than
    // leaking through the app's UI.
    const spawned = await window.agentgridPty.spawn({
      paneId: this.pane.id,
      cols: sized.cols,
      rows: sized.rows,
      assignment: this.pane.assignment,
      context: this.pane.launchContext,
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
    if (autoCmd && !restarting) {
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
    if (this.ptyId && !this.exited) {
      await window.agentgridPty.kill(this.ptyId);
    }
    this.term.clear();
    await this.spawn(true);
  }

  async kill(): Promise<void> {
    if (!this.ptyId || this.exited) return;
    await window.agentgridPty.kill(this.ptyId);
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

// ─── Tabs ───────────────────────────────────────────────────────────────────

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

class WorkspaceTab implements TabBase {
  readonly id: string;
  readonly kind: 'workspace' = 'workspace';
  title: string;
  readonly panelEl: HTMLElement;
  readonly workspaceEl: HTMLElement;
  tabButtonEl: HTMLButtonElement | null = null;
  private readonly store: WorkspaceStore;
  private readonly controllers = new Map<string, TerminalPaneController>();
  private readonly pendingPickIds = new Set<string>();
  private isClosingPane = false;
  private isClosing = false;

  constructor(opts: {
    id: string;
    title: string;
    initialPaneCount: PaneCount;
    initialAssignments: PaneAssignment[];
  }) {
    this.id = opts.id;
    this.title = opts.title;
    this.store = new WorkspaceStore();

    this.panelEl = document.createElement('section');
    this.panelEl.id = `panel-${opts.id}`;
    this.panelEl.className = 'tab-panel workspace-panel';
    this.panelEl.setAttribute('role', 'tabpanel');
    this.panelEl.setAttribute('aria-labelledby', `tab-${opts.id}`);
    this.panelEl.hidden = true;

    this.workspaceEl = document.createElement('main');
    this.workspaceEl.className = 'workspace';
    this.panelEl.append(this.workspaceEl);

    // Seed the store with the launcher's chosen layout & assignments.
    this.store.setPaneCount(opts.initialPaneCount);
    const panes = this.store.snapshot.panes;
    for (let i = 0; i < panes.length; i++) {
      const assignment = opts.initialAssignments[i] ?? 'shell';
      this.store.updatePane(panes[i].id, {
        assignment,
        launchContext: resolveContextForAssignment(assignment),
        title: ASSIGNMENT_LABELS[assignment],
      });
    }
  }

  /** Attach to the workspace mount point. Called once by TabManager. */
  attach(mount: HTMLElement): void {
    mount.append(this.panelEl);
  }

  /** Hide / show this panel. Used on tab switch. */
  setActive(active: boolean): void {
    this.panelEl.hidden = !active;
    this.panelEl.setAttribute('aria-hidden', active ? 'false' : 'true');
    if (active) {
      this.requestResizeAll();
      const focused = this.store.snapshot.focusedPaneId;
      if (focused) this.controllers.get(focused)?.focus();
    }
  }

  get paneCount(): PaneCount {
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

  /** Mount panes + grid for the first time. */
  initialRender(): void {
    this.syncWorkspace();
    const focused = this.store.snapshot.focusedPaneId;
    if (focused) this.controllers.get(focused)?.focus();
  }

  setPaneCount(count: PaneCount): void {
    if (count === this.store.snapshot.settings.paneCount) return;
    const before = new Set(this.store.snapshot.panes.map((p) => p.id));
    const { removed } = this.store.setPaneCount(count);
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
    const focused = this.store.snapshot.focusedPaneId;
    if (focused) this.controllers.get(focused)?.focus();
  }

  private focusPane = (id: string): void => {
    this.store.focusPane(id);
    for (const pane of this.store.snapshot.panes) {
      this.renderPaneChrome(pane.id);
    }
  };

  private requestPaneClose = (id: string): void => {
    void this.closePane(id);
  };

  private renderPaneChrome(paneId: string): void {
    const pane = this.store.snapshot.panes.find((item) => item.id === paneId);
    const controller = this.controllers.get(paneId);
    if (!pane || !controller) return;
    controller.update(pane);
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
   * open but empty — the user can use the +/- pane-count picker or close
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

  /** Shutdown variant — main process owns PTY teardown during quit. */
  disposeForShutdown(): void {
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

// ─── Tab manager ────────────────────────────────────────────────────────────

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

  /** Open a brand-new workspace tab and switch to it. */
  openWorkspaceTab(opts: { paneCount: PaneCount; assignments: PaneAssignment[] }): WorkspaceTab {
    const id = `workspace-${this.workspaceSeq++}`;
    const title = `Workspace ${this.workspaceSeq - 1}`;
    const tab = new WorkspaceTab({
      id,
      title,
      initialPaneCount: opts.paneCount,
      initialAssignments: opts.assignments,
    });
    this.workspaces.push(tab);
    tab.attach(workspaceMountEl!);
    tab.initialRender();
    this.renderTabBar();
    this.switchTo(id);
    return tab;
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

  renderTabBar(): void {
    tabBarEl!.replaceChildren();

    const homeBtn = this.makeTabButton({
      id: this.home.id,
      label: 'Home',
      iconHTML: HOME_ICON_SVG,
      isActive: this.activeId === this.home.id,
      onClick: () => this.switchTo(this.home.id),
    });
    homeBtn.classList.add('tab-button-home');
    this.home.tabButtonEl = homeBtn;
    tabBarEl!.append(homeBtn);

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
      tabBarEl!.append(btn);
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

const HOME_ICON_SVG = `
<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 11.5 12 4l9 7.5"/>
  <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>
</svg>`;

// ─── Launcher draft (lives on the Home tab) ─────────────────────────────────

interface LauncherDraft {
  paneCount: PaneCount;
  assignments: PaneAssignment[];
  projectFolder: string | null;
}

const launcherDraft: LauncherDraft = {
  paneCount: 1,
  assignments: ['shell'],
  projectFolder: null,
};

function ensureAssignmentsLength(draft: LauncherDraft): void {
  while (draft.assignments.length < draft.paneCount) {
    draft.assignments.push('shell');
  }
  if (draft.assignments.length > draft.paneCount) {
    draft.assignments.length = draft.paneCount;
  }
}

// ─── Header / status ────────────────────────────────────────────────────────

function setStatus(text: string): void {
  if (statusEl) statusEl.textContent = text;
}

function updateHeaderStatus(): void {
  const active = tabManager.activeTab;
  if (active.kind === 'home') {
    const wsCount = tabManager.workspaceTabs.length;
    setStatus(
      wsCount === 0
        ? 'Ready'
        : `Home · ${wsCount} workspace${wsCount === 1 ? '' : 's'} open`,
    );
    paneCountEl!.hidden = true;
    return;
  }
  const ws = active as WorkspaceTab;
  const total = ws.totalPaneCount;
  const running = ws.runningPaneCount;
  const errors = ws.errorPaneCount;
  const parts = [`${total} pane${total === 1 ? '' : 's'}`, `${running} running`];
  if (errors > 0) parts.push(`${errors} failed`);
  setStatus(parts.join(' · '));
  paneCountEl!.hidden = false;
  renderPaneCountControls(ws);
}

function renderPaneCountControls(ws: WorkspaceTab): void {
  paneCountEl!.replaceChildren();
  const current = ws.paneCount;
  for (let count = 1; count <= 6; count++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(count);
    button.className = count === current ? 'active' : '';
    button.title = `${count} pane${count === 1 ? '' : 's'}`;
    button.addEventListener('click', () => {
      ws.setPaneCount(count as PaneCount);
      updateHeaderStatus();
      tabManager.refreshIndicators();
    });
    paneCountEl!.append(button);
  }
}

// Single notification point for "something workspace-shaped changed" — tab
// chrome (running counts etc.), header status, and Home shortcuts all read
// from the tab manager.
function onWorkspaceTabChromeChange(): void {
  updateHeaderStatus();
  tabManager.refreshIndicators();
}

// ─── Home: launcher rendering ───────────────────────────────────────────────

function renderProjectFolder(): void {
  const folder = launcherDraft.projectFolder;
  if (folder) {
    projectFolderPanelEl!.dataset.state = 'selected';
    projectFolderPathEl!.textContent = folder;
    projectFolderPathEl!.title = folder;
    projectFolderHintEl!.textContent = 'Terminal panes will start here when supported.';
    projectFolderBrowseEl!.textContent = 'Change\u2026';
  } else {
    projectFolderPanelEl!.dataset.state = 'empty';
    projectFolderPathEl!.textContent = 'No folder selected';
    projectFolderPathEl!.title = '';
    projectFolderHintEl!.textContent = 'Choose a project folder before launching.';
    projectFolderBrowseEl!.textContent = 'Browse folder\u2026';
  }
}

let projectFolderNoticeTimer = 0;
function showProjectFolderNotice(message: string): void {
  const footnote = projectFolderPanelEl!.querySelector('.project-folder-footnote');
  if (!(footnote instanceof HTMLElement)) return;
  const defaultText = 'Terminal panes will start from this folder when supported.';
  footnote.textContent = message;
  footnote.classList.add('transient');
  if (projectFolderNoticeTimer) window.clearTimeout(projectFolderNoticeTimer);
  projectFolderNoticeTimer = window.setTimeout(() => {
    footnote.textContent = defaultText;
    footnote.classList.remove('transient');
    projectFolderNoticeTimer = 0;
  }, 3200);
}

projectFolderBrowseEl.addEventListener('click', () => {
  showProjectFolderNotice(
    'Native folder picker is coming soon \u2014 this is a UI preview of the working-folder step.',
  );
});

function renderLauncherPaneCount(): void {
  launcherPaneCountEl!.replaceChildren();
  for (let count = 1; count <= 6; count++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(count);
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', count === launcherDraft.paneCount ? 'true' : 'false');
    button.className = count === launcherDraft.paneCount ? 'active' : '';
    button.addEventListener('click', () => {
      launcherDraft.paneCount = count as PaneCount;
      ensureAssignmentsLength(launcherDraft);
      renderLauncherPaneCount();
      renderLauncherAssignments();
    });
    launcherPaneCountEl!.append(button);
  }
}

function renderLauncherAssignments(): void {
  launcherAssignmentsEl!.replaceChildren();
  for (let i = 0; i < launcherDraft.paneCount; i++) {
    const row = document.createElement('div');
    row.className = 'assignment-row';

    const label = document.createElement('span');
    label.className = 'assignment-label';
    label.textContent = String(i + 1);

    const select = document.createElement('select');
    select.setAttribute('aria-label', `Slot ${i + 1}: tool`);
    for (const assignment of ALL_ASSIGNMENTS) {
      const option = document.createElement('option');
      option.value = assignment;
      option.textContent = describeAssignmentForSelect(assignment);
      if (assignment === launcherDraft.assignments[i]) option.selected = true;
      select.append(option);
    }
    select.addEventListener('change', () => {
      launcherDraft.assignments[i] = select.value as PaneAssignment;
      renderLauncher();
    });

    const hint = document.createElement('span');
    hint.className = 'assignment-status';
    const current = launcherDraft.assignments[i];
    hint.textContent = assignmentLaunchHint(current);
    hint.title = assignmentLaunchHint(current);

    row.append(label, select, hint);
    launcherAssignmentsEl!.append(row);
  }
}

function renderOpenWorkspaces(): void {
  const tabs = tabManager.workspaceTabs;
  if (tabs.length === 0) {
    openWorkspacesEl!.hidden = true;
    openWorkspacesListEl!.replaceChildren();
    return;
  }
  openWorkspacesEl!.hidden = false;
  openWorkspacesListEl!.replaceChildren();
  for (const ws of tabs) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'open-workspace-card';
    card.addEventListener('click', () => tabManager.switchTo(ws.id));

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
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      void tabManager.closeTab(ws.id);
    });
    card.append(close);

    openWorkspacesListEl!.append(card);
  }
}

function renderLauncher(): void {
  ensureAssignmentsLength(launcherDraft);
  renderProjectFolder();
  renderLauncherPaneCount();
  renderLauncherAssignments();
  launchButtonEl!.disabled = !window.agentgridPty;
  launchButtonEl!.title = '';
  updateHeaderStatus();
}

const AUTH_LOCAL_SKIP_KEY = 'agentgrid.auth.continueLocal';

function authLocalGatePassed(): boolean {
  try {
    return sessionStorage.getItem(AUTH_LOCAL_SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

/** Chrome entrance when the workspace shell becomes visible after the optional auth overlay. */
function runHomeChromeEntranceAnimations(): void {
  const header = document.querySelector('.app-header');
  if (header instanceof HTMLElement) {
    void animate(
      header,
      { opacity: [0, 1], transform: [translateY(-MOTION_Y_XS), translateYToken(MOTION_Y_ZERO)] },
      { duration: 0.22, ease: EASE_OUT },
    );
  }
  void fadeIn(homePanelEl!, { y: MOTION_Y_MD, duration: 0.28, delay: 0.05 });
  const hero = document.querySelector('.home-hero');
  const panel = document.querySelector('.launcher-panel');
  if (hero instanceof HTMLElement) {
    void fadeIn(hero, { y: MOTION_Y_SM, duration: 0.3, delay: 0.08 });
  }
  if (panel instanceof HTMLElement) {
    void fadeIn(panel, { y: MOTION_Y_SM, duration: 0.3, delay: 0.12 });
  }
}

function setAuthLayer(showMainChrome: boolean): void {
  mainAppEl.hidden = !showMainChrome;
  if (authOverlayEl) authOverlayEl.hidden = showMainChrome;
}

function renderAuthStatus(status: AuthStatus): void {
  if (accountButtonEl) {
    accountButtonEl.dataset.state = status.signedIn
      ? 'signed-in'
      : status.secureStorage.available
        ? 'signed-out'
        : 'warning';
    accountButtonEl.textContent = status.signedIn
      ? status.user?.email || status.user?.name || 'Signed in'
      : 'Sign in';
    accountButtonEl.title = status.signedIn
      ? 'Click to sign out'
      : status.secureStorage.available
        ? `Sign in at ${status.accountUrl}`
        : status.secureStorage.reason || 'Secure storage is unavailable';
  }

  if (status.signedIn) {
    setAuthLayer(true);
    if (authStatusEl) {
      authStatusEl.hidden = false;
      authStatusEl.textContent = `Signed in as ${status.user?.email ?? status.user?.name ?? 'AgentGrid user'}.`;
    }
    return;
  }

  if (!status.secureStorage.available && authStatusEl) {
    authStatusEl.hidden = false;
    authStatusEl.textContent = status.secureStorage.reason ?? 'Secure storage is unavailable.';
  }
}

function startDesktopAuth(): void {
  if (!window.agentgridAuth) {
    if (authStatusEl) {
      authStatusEl.hidden = false;
      authStatusEl.textContent = 'Desktop auth bridge unavailable (preload not loaded).';
    }
    return;
  }

  if (authStatusEl) {
    authStatusEl.hidden = false;
    authStatusEl.textContent = 'Opening your browser...';
  }

  void window.agentgridAuth.start().then((result) => {
    if (!result.ok && authStatusEl) {
      authStatusEl.hidden = false;
      authStatusEl.textContent = result.error ?? 'Could not start sign-in.';
    }
  });
}

/** Optional first-run overlay: auth always opens the system browser. */
function initAuthGate(): void {
  if (!authOverlayEl) {
    mainAppEl.hidden = false;
    return;
  }
  setAuthLayer(false);

  authGoogleBtn?.addEventListener('click', startDesktopAuth);

  authEmailForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    startDesktopAuth();
  });

  authContinueLocalBtn?.addEventListener('click', () => {
    try {
      sessionStorage.setItem(AUTH_LOCAL_SKIP_KEY, '1');
    } catch {
      /* ignore */
    }
    setAuthLayer(true);
    if (window.agentgridPty) {
      runHomeChromeEntranceAnimations();
    }
  });

  accountButtonEl?.addEventListener('click', () => {
    if (!window.agentgridAuth) return;
    void window.agentgridAuth.status().then((status) => {
      if (status.signedIn) {
        void window.agentgridAuth?.logout();
      } else {
        startDesktopAuth();
      }
    });
  });

  window.agentgridAuth?.onChanged((status) => {
    renderAuthStatus(status);
    if (status.signedIn && window.agentgridPty) runHomeChromeEntranceAnimations();
  });

  void window.agentgridAuth?.status().then((status) => {
    renderAuthStatus(status);
    if (status.signedIn || authLocalGatePassed()) {
      setAuthLayer(true);
    }
  });
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────

initAuthGate();

const homeTab: HomeTab = {
  id: 'home',
  kind: 'home',
  title: 'Home',
  panelEl: homePanelEl,
  tabButtonEl: null,
};

const tabManager = new TabManager(homeTab);

launchButtonEl.addEventListener('click', () => {
  if (!window.agentgridPty) return;
  ensureAssignmentsLength(launcherDraft);

  void animate(
    launchButtonEl!,
    { transform: ['scale(0.98)', 'scale(1)'] },
    { duration: 0.15, ease: EASE_OUT },
  );

  const tab = tabManager.openWorkspaceTab({
    paneCount: launcherDraft.paneCount,
    assignments: [...launcherDraft.assignments],
  });
  void tab;
});


// Ctrl/Cmd+W closes the active workspace tab; never closes Home.
document.addEventListener('keydown', (e) => {
  const isMod = e.ctrlKey || e.metaKey;
  if (isMod && e.key.toLowerCase() === 'w') {
    const active = tabManager.activeTab;
    if (active.kind === 'workspace') {
      e.preventDefault();
      void tabManager.closeTab(active.id);
    }
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

if (!window.agentgridPty) {
  setStatus('bridge unavailable');
  launchButtonEl!.disabled = true;
} else {
  renderLauncher();
  updateHeaderStatus();
  if (!mainAppEl.hidden) {
    runHomeChromeEntranceAnimations();
  }
}
