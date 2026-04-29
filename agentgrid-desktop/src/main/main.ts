import { app, BrowserWindow, ipcMain, session, shell, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';

import {
  IPC,
  type AuthStartResult,
  type AuthStatus,
  type CliInstallFinishedRequest,
  type CliInstallOpenRequest,
  type PtyKillPayload,
  type PtyLaunchContext,
  type PtyResizePayload,
  type PtySpawnRequest,
  type PtySpawnResponse,
  type PtyWritePayload,
  type ShellOpenExternalPayload,
  type ShellOpenExternalResult,
} from '../shared/ipc';
import type {
  CliDetectAllRequest,
  CliDetectRequest,
  CliDetectionResult,
  CliKind,
} from '../shared/cli';
import { CLI_KINDS } from '../shared/cli';
import type { PaneAssignment } from '../shared/workspace';
import {
  handleAuthCallback,
  logoutDesktop,
  refreshAuthFromServer,
  registerAuthProtocol,
  startAuthFlow,
} from './authFlow';
import { authStatus } from './authSession';
import { detectAllClis, detectCli } from './cliDetect';
import {
  finishInstallForEvent,
  installSessionForEvent,
  openInstallWindow,
  readInstallMarkerForEvent,
} from './cliInstall';
import { PtyManager } from './ptyManager';

const isDev = process.env.AGENTGRID_DEV === '1' || !app.isPackaged;
const DEFAULT_RENDERER_DEV_URL = 'http://localhost:5173';
const DEV_SERVER_URL = (
  process.env.AGENTGRID_RENDERER_DEV_URL?.trim() || DEFAULT_RENDERER_DEV_URL
).replace(/\/+$/, '');

// Track the PtyManager per window so window.close() tears down the right PTYs.
const managersByWindowId = new Map<number, PtyManager>();
// Pending drain promises started by `BrowserWindow.on('closed')`. The
// `before-quit` handler awaits all of them so Electron does not exit while
// node-pty's Windows ConoutConnection drain workers are still alive.
const pendingDrains = new Set<Promise<void>>();

// Serialized shutdown latch. On Windows, node-pty's ConoutConnection uses a
// 1-second async drain timer before terminating its worker thread; if the
// main process exits before that timer fires, V8 is torn down while worker
// threads still hold native ConPTY pipe handles, producing STATUS_ACCESS_VIOLATION
// (exit code 3221225477). We intercept `before-quit`, drain every PtyManager,
// then call app.exit(0).
let isShuttingDown = false;

registerAuthProtocol();
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const callbackUrl = argv.find((arg) => arg.startsWith('agentgrid://'));
    if (callbackUrl) void handleAuthCallback(callbackUrl);
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  void handleAuthCallback(url);
});

function resolveSenderManager(event: IpcMainInvokeEvent): PtyManager | null {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  return managersByWindowId.get(win.id) ?? null;
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC.ptySpawn,
    async (event, req: PtySpawnRequest): Promise<PtySpawnResponse | null> => {
      const manager = resolveSenderManager(event);
      if (!manager) return null;
      if (typeof req?.paneId !== 'string' || !req.paneId.trim()) return null;
      const assignment = normaliseAssignment(req?.assignment);
      if (!assignment) return null;
      const context = normaliseContext(req?.context);
      const cols = Number.isFinite(req?.cols) ? req.cols : 80;
      const rows = Number.isFinite(req?.rows) ? req.rows : 24;
      return manager.spawn({
        paneId: req.paneId,
        cols,
        rows,
        assignment,
        context,
        cwd: typeof req?.cwd === 'string' ? req.cwd : undefined,
        detectedPath: typeof req?.detectedPath === 'string' ? req.detectedPath : undefined,
      });
    },
  );

  ipcMain.handle(IPC.ptyWrite, (event, payload: PtyWritePayload) => {
    const manager = resolveSenderManager(event);
    if (!manager || !payload) return;
    if (typeof payload.id !== 'string' || typeof payload.data !== 'string') return;
    manager.write(payload.id, payload.data);
  });

  ipcMain.handle(IPC.ptyResize, (event, payload: PtyResizePayload) => {
    const manager = resolveSenderManager(event);
    if (!manager || !payload) return;
    manager.resize(payload.id, payload.cols, payload.rows);
  });

  ipcMain.handle(IPC.ptyKill, (event, payload: PtyKillPayload) => {
    const manager = resolveSenderManager(event);
    if (!manager || !payload) return;
    manager.kill(payload.id);
  });

  ipcMain.handle(
    IPC.cliDetect,
    async (_event, payload: CliDetectRequest): Promise<CliDetectionResult | null> => {
      if (!payload || !isKnownCliKind(payload.kind)) return null;
      return detectCli(payload.kind);
    },
  );

  ipcMain.handle(
    IPC.cliDetectAll,
    async (_event, payload: CliDetectAllRequest | undefined): Promise<CliDetectionResult[]> => {
      void payload;
      return detectAllClis();
    },
  );

  ipcMain.handle(IPC.cliInstallOpen, async (event, payload: CliInstallOpenRequest) => {
    if (!payload || !isKnownCliKind(payload.kind)) return;
    const opener = BrowserWindow.fromWebContents(event.sender);
    if (!opener) return;
    await openInstallWindow({
      kind: payload.kind,
      opener,
      preloadPath: path.join(__dirname, '..', 'preload', 'preload.js'),
      devUrl: isDev ? DEV_SERVER_URL : null,
      registerManager: (win, manager) => managersByWindowId.set(win.id, manager),
      unregisterManager: (win) => managersByWindowId.delete(win.id),
      registerDrain: (promise) => {
        const tracked = promise.finally(() => pendingDrains.delete(tracked));
        pendingDrains.add(tracked);
      },
    });
  });

  ipcMain.handle(IPC.cliInstallSession, (event) => installSessionForEvent(event));

  ipcMain.handle(IPC.cliInstallMarkerRead, (event) => readInstallMarkerForEvent(event));

  ipcMain.handle(IPC.cliInstallFinished, async (event, payload: CliInstallFinishedRequest) => {
    const exitCode = Number.isFinite(payload?.exitCode) ? payload.exitCode : 1;
    await finishInstallForEvent(event, exitCode);
  });

  ipcMain.handle(
    IPC.shellOpenExternal,
    async (_event, payload: ShellOpenExternalPayload): Promise<ShellOpenExternalResult> => {
      const raw = payload?.url;
      if (typeof raw !== 'string' || !raw.trim()) return { ok: false, error: 'Invalid URL' };
      let parsed: URL;
      try {
        parsed = new URL(raw);
      } catch {
        return { ok: false, error: 'Invalid URL' };
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, error: 'Only http(s) URLs are allowed' };
      }
      await shell.openExternal(parsed.toString());
      return { ok: true };
    },
  );

  ipcMain.handle(IPC.authStatus, async (): Promise<AuthStatus> => authStatus());

  ipcMain.handle(IPC.authStart, async (): Promise<AuthStartResult> => {
    try {
      return await startAuthFlow();
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Failed to start sign-in' };
    }
  });

  ipcMain.handle(IPC.authLogout, async (): Promise<void> => {
    await logoutDesktop();
  });
}

function isKnownCliKind(value: unknown): value is CliKind {
  return typeof value === 'string' && (CLI_KINDS as readonly string[]).includes(value);
}

const ALLOWED_ASSIGNMENTS: readonly PaneAssignment[] = ['shell', 'codex', 'claude', 'gemini'];

function normaliseAssignment(value: unknown): PaneAssignment | null {
  if (typeof value !== 'string') return null;
  return (ALLOWED_ASSIGNMENTS as readonly string[]).includes(value)
    ? (value as PaneAssignment)
    : null;
}

function normaliseContext(value: unknown): PtyLaunchContext | undefined {
  if (value === 'native' || value === 'wsl') return value;
  return undefined;
}

async function createMainWindow(): Promise<BrowserWindow> {
  // Default size is only used when the user later restores the window from
  // the maximized state — it gives a sensible footprint instead of dropping
  // them into a tiny default Electron window.
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 720,
    minHeight: 480,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const manager = new PtyManager(win.webContents);
  managersByWindowId.set(win.id, manager);
  hardenWindowNavigation(win);

  // Maximize the window before it becomes visible so the user never sees a
  // brief small-window flash on launch. `maximize()` sets the bounds to the
  // current display's work area; `show()` happens on `ready-to-show` once
  // the renderer has painted, which avoids the empty-frame flash that
  // `show: true` would otherwise produce.
  win.once('ready-to-show', () => {
    if (!win.isMaximized()) win.maximize();
    win.show();
  });

  win.on('closed', () => {
    managersByWindowId.delete(win.id);
    // Kick off the async drain here so native handles start releasing
    // immediately, but register the promise so `before-quit` (which fires
    // after this on Windows single-window close) can await it. This is what
    // prevents Electron from exiting mid-drain and crashing with
    // STATUS_ACCESS_VIOLATION (3221225477).
    const drain = manager.disposeAllAsync().finally(() => {
      pendingDrains.delete(drain);
    });
    pendingDrains.add(drain);
  });

  if (isDev) {
    await win.loadURL(DEV_SERVER_URL);
  } else {
    const indexHtml = path.join(__dirname, '..', 'renderer', 'index.html');
    await win.loadFile(indexHtml);
  }

  return win;
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  registerIpcHandlers();
  await refreshAuthFromServer();
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

function hardenWindowNavigation(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (isAllowedAppNavigation(url)) return;
    event.preventDefault();
  });
}

function isAllowedAppNavigation(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (isDev && url.origin === DEV_SERVER_URL) return true;
    if (url.protocol === 'file:') return true;
    return false;
  } catch {
    return false;
  }
}

app.on('window-all-closed', () => {
  // Windows/Linux: quit; macOS: keep app alive until Cmd+Q (standard convention).
  // Actual shutdown sequencing lives in `before-quit` below.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Serialized shutdown. The first `before-quit` is preempted; we drain every
// PtyManager (awaiting node-pty's Windows ConoutConnection drain) and then
// call app.exit(0), which does not re-fire `before-quit`.
app.on('before-quit', (event) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  event.preventDefault();

  // Managers whose windows already fired `closed` are being drained in
  // `pendingDrains`. Managers whose windows are still open (e.g. Cmd+Q on
  // macOS before windows close) need a fresh drain kicked off here.
  const extraDrains: Promise<void>[] = [];
  for (const m of managersByWindowId.values()) {
    extraDrains.push(m.disposeAllAsync());
  }
  managersByWindowId.clear();

  Promise.allSettled([...pendingDrains, ...extraDrains]).finally(() => {
    // app.exit skips the `before-quit` / `will-quit` event pipeline entirely,
    // so no re-entrance into this handler.
    app.exit(0);
  });
});
