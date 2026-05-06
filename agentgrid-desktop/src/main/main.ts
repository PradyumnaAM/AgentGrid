import { app, BrowserWindow, dialog, ipcMain, session, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron';
import path from 'node:path';

import {
  IPC,
  type AppStatePatchRequest,
  type AppStateSaveRequest,
  type BrowserPreviewCreateRequest,
  type BrowserPreviewLoadUrlRequest,
  type BrowserPreviewNavigateRequest,
  type BrowserPreviewSetBoundsRequest,
  type BrowserPreviewWorkspaceRequest,
  type CliInstallFinishedRequest,
  type CliInstallOpenRequest,
  type FolderSelectResult,
  type PtyKillPayload,
  type PtyLaunchContext,
  type PtyResizePayload,
  type PtySpawnRequest,
  type PtySpawnResponse,
  type PtyWritePayload,
} from '../shared/ipc';
import type {
  CliDetectAllRequest,
  CliDetectRequest,
  CliDetectionResult,
  CliKind,
} from '../shared/cli';
import { CLI_KINDS } from '../shared/cli';
import type { PaneAssignment } from '../shared/workspace';
import { AppStateStore } from './appStateStore';
import { BrowserPreviewManager } from './browserPreviewManager';
import { detectAllClis, detectCli } from './cliDetect';
import {
  finishInstallForEvent,
  installSessionForEvent,
  openInstallWindow,
  readInstallMarkerForEvent,
} from './cliInstall';
import { PtyManager } from './ptyManager';

const isDev = process.env.AGENTGRID_DEV === '1' || !app.isPackaged;
const APP_ID = 'com.agentgrid.desktop';
const DEFAULT_RENDERER_DEV_URL = 'http://localhost:5173';
const DEV_SERVER_URL = (
  process.env.AGENTGRID_RENDERER_DEV_URL?.trim() || DEFAULT_RENDERER_DEV_URL
).replace(/\/+$/, '');
const SPLASH_MIN_VISIBLE_MS = 2250;
const APP_ICON_PATH = path.join(__dirname, '..', '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

// Track the PtyManager per window so window.close() tears down the right PTYs.
const managersByWindowId = new Map<number, PtyManager>();
const previewManagersByWindowId = new Map<number, BrowserPreviewManager>();
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    void argv;
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

function resolveSenderManager(event: IpcMainInvokeEvent): PtyManager | null {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  return managersByWindowId.get(win.id) ?? null;
}

function resolveSenderPreviewManager(event: IpcMainInvokeEvent): BrowserPreviewManager | null {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  return previewManagersByWindowId.get(win.id) ?? null;
}

function registerIpcHandlers(appStateStore: AppStateStore): void {
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
      return detectCli(payload.kind, { force: payload.force === true });
    },
  );

  ipcMain.handle(
    IPC.cliDetectAll,
    async (_event, payload: CliDetectAllRequest | undefined): Promise<CliDetectionResult[]> => {
      return detectAllClis({ force: payload?.force === true });
    },
  );

  ipcMain.handle(IPC.cliInstallOpen, async (event, payload: CliInstallOpenRequest) => {
    if (!payload || !isKnownCliKind(payload.kind)) return;
    const opener = BrowserWindow.fromWebContents(event.sender);
    if (!opener) return;
    await openInstallWindow({
      kind: payload.kind,
      opener,
      iconPath: APP_ICON_PATH,
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

  ipcMain.handle(IPC.folderSelect, async (event): Promise<FolderSelectResult> => {
    const opener = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: 'Select project folder',
      properties: ['openDirectory'],
    };
    const result = opener
      ? await dialog.showOpenDialog(opener, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    return { canceled: false, path: result.filePaths[0] };
  });

  ipcMain.handle(IPC.appStateLoad, async () => appStateStore.load());

  ipcMain.handle(IPC.appStateSave, async (_event, payload: AppStateSaveRequest | undefined) => {
    return appStateStore.save(payload?.state);
  });

  ipcMain.handle(IPC.appStatePatch, async (_event, payload: AppStatePatchRequest | undefined) => {
    return appStateStore.patch(payload?.patch);
  });

  ipcMain.handle(IPC.browserPreviewCreate, async (event, payload: BrowserPreviewCreateRequest | undefined) => {
    const manager = resolveSenderPreviewManager(event);
    if (!manager || !payload) return { ok: false, error: 'Browser preview unavailable' };
    try {
      const state = manager.create(payload.workspaceId, payload.bounds, payload.initialUrl);
      return { ok: true, state };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not create browser preview' };
    }
  });

  ipcMain.handle(IPC.browserPreviewSetBounds, async (event, payload: BrowserPreviewSetBoundsRequest | undefined) => {
    const manager = resolveSenderPreviewManager(event);
    if (!manager || !payload) return { ok: false, error: 'Browser preview unavailable' };
    try {
      const state = manager.setBounds(payload.workspaceId, payload.bounds, payload.visible);
      return { ok: true, state };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not update browser preview' };
    }
  });

  ipcMain.handle(IPC.browserPreviewLoadUrl, async (event, payload: BrowserPreviewLoadUrlRequest | undefined) => {
    const manager = resolveSenderPreviewManager(event);
    if (!manager || !payload) return { ok: false, error: 'Browser preview unavailable' };
    try {
      const state = await manager.loadUrl(payload.workspaceId, payload.url);
      return { ok: true, state };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not load URL' };
    }
  });

  ipcMain.handle(IPC.browserPreviewNavigate, async (event, payload: BrowserPreviewNavigateRequest | undefined) => {
    const manager = resolveSenderPreviewManager(event);
    if (!manager || !payload) return { ok: false, error: 'Browser preview unavailable' };
    try {
      const state = manager.navigate(payload.workspaceId, payload.action);
      return { ok: true, state };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not navigate browser preview' };
    }
  });

  ipcMain.handle(IPC.browserPreviewOpenExternal, async (event, payload: BrowserPreviewWorkspaceRequest | undefined) => {
    const manager = resolveSenderPreviewManager(event);
    if (!manager || !payload) return { ok: false, error: 'Browser preview unavailable' };
    try {
      const state = await manager.openExternal(payload.workspaceId);
      return { ok: true, state };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not open URL externally' };
    }
  });

  ipcMain.handle(IPC.browserPreviewDestroy, async (event, payload: BrowserPreviewWorkspaceRequest | undefined) => {
    const manager = resolveSenderPreviewManager(event);
    if (!manager || !payload) return { ok: false, error: 'Browser preview unavailable' };
    try {
      manager.destroy(payload.workspaceId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not destroy browser preview' };
    }
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

function rendererEntryUrl(fileName: string): string {
  return `${DEV_SERVER_URL}/${fileName}`;
}

async function loadRendererEntry(win: BrowserWindow, fileName: string): Promise<void> {
  if (isDev) {
    await win.loadURL(rendererEntryUrl(fileName));
    return;
  }
  await win.loadFile(path.join(__dirname, '..', 'renderer', fileName));
}

function waitForReadyToShow(win: BrowserWindow): Promise<void> {
  if (win.isDestroyed() || win.isVisible()) return Promise.resolve();
  return new Promise((resolve) => {
    win.once('ready-to-show', () => resolve());
  });
}

function createSplashWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: 'AgentGrid',
    icon: APP_ICON_PATH,
    width: 440,
    height: 352,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    center: true,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  hardenWindowNavigation(win);
  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.show();
  });
  return win;
}

async function createWindowWithSplash(): Promise<BrowserWindow> {
  const splash = createSplashWindow();
  const splashMinimum = delay(SPLASH_MIN_VISIBLE_MS);

  try {
    await loadRendererEntry(splash, 'splash.html');
    const mainWindow = await createMainWindow();
    await splashMinimum;

    if (!splash.isDestroyed()) {
      splash.close();
    }
    if (!mainWindow.isDestroyed()) {
      if (!mainWindow.isMaximized()) mainWindow.maximize();
      mainWindow.show();
    }
    return mainWindow;
  } catch (err) {
    if (!splash.isDestroyed()) {
      splash.close();
    }
    throw err;
  }
}

async function createMainWindow(): Promise<BrowserWindow> {
  // Default size is only used when the user later restores the window from
  // the maximized state — it gives a sensible footprint instead of dropping
  // them into a tiny default Electron window.
  const win = new BrowserWindow({
    title: 'AgentGrid',
    icon: APP_ICON_PATH,
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
  const previewManager = new BrowserPreviewManager(win, win.webContents);
  managersByWindowId.set(win.id, manager);
  previewManagersByWindowId.set(win.id, previewManager);
  hardenWindowNavigation(win);
  const readyToShow = waitForReadyToShow(win);

  win.on('closed', () => {
    managersByWindowId.delete(win.id);
    previewManagersByWindowId.delete(win.id);
    previewManager.disposeAll();
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

  await loadRendererEntry(win, 'index.html');
  await readyToShow;

  return win;
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  const appStateStore = new AppStateStore(app.getPath('userData'));
  await appStateStore.load();
  registerIpcHandlers(appStateStore);
  await createWindowWithSplash();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindowWithSplash();
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
  for (const manager of previewManagersByWindowId.values()) {
    manager.disposeAll();
  }
  previewManagersByWindowId.clear();

  Promise.allSettled([...pendingDrains, ...extraDrains]).finally(() => {
    // app.exit skips the `before-quit` / `will-quit` event pipeline entirely,
    // so no re-entrance into this handler.
    app.exit(0);
  });
});
