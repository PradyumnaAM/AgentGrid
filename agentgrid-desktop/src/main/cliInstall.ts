import { BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import type { CliKind } from '../shared/cli';
import { getInstallCommand } from '../shared/cli';
import type {
  CliInstallCompletedEvent,
  CliInstallMarkerReadResult,
  CliInstallSession,
} from '../shared/ipc';
import { IPC } from '../shared/ipc';
import { detectCli } from './cliDetect';
import { PtyManager } from './ptyManager';

interface InstallRecord {
  session: CliInstallSession;
  window: BrowserWindow;
  opener: BrowserWindow;
  manager: PtyManager;
}

const recordsByWindowId = new Map<number, InstallRecord>();

export async function openInstallWindow(args: {
  kind: CliKind;
  opener: BrowserWindow;
  preloadPath: string;
  devUrl: string | null;
  registerManager: (win: BrowserWindow, manager: PtyManager) => void;
  unregisterManager: (win: BrowserWindow) => void;
  registerDrain: (promise: Promise<void>) => void;
}): Promise<void> {
  const platform = currentInstallPlatform();
  const command = platform ? getInstallCommand(args.kind, platform) : null;
  if (!command) {
    throw new Error(`No supported install command for ${args.kind} on ${process.platform}`);
  }

  const markerPath = path.join(os.tmpdir(), `agentgrid-cli-install-${randomUUID()}.exit`);
  await fs.rm(markerPath, { force: true });
  const scriptPath = process.platform === 'win32'
    ? await createWindowsInstallScript(args.kind, command.command, markerPath)
    : undefined;

  const win = new BrowserWindow({
    width: 920,
    height: 620,
    minWidth: 640,
    minHeight: 420,
    title: `Install ${args.kind}`,
    parent: args.opener,
    modal: false,
    show: false,
    webPreferences: {
      preload: args.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const manager = new PtyManager(win.webContents);
  args.registerManager(win, manager);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = args.devUrl ? url.startsWith(args.devUrl) : url.startsWith('file:');
    if (!allowed) event.preventDefault();
  });

  const session: CliInstallSession = {
    id: randomUUID(),
    kind: args.kind,
    label: command.label,
    command: command.command,
    markerPath,
    scriptPath,
  };
  recordsByWindowId.set(win.id, { session, window: win, opener: args.opener, manager });

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    recordsByWindowId.delete(win.id);
    args.unregisterManager(win);
    void fs.rm(markerPath, { force: true });
    if (scriptPath) void fs.rm(scriptPath, { force: true });
    const drain = manager.disposeAllAsync();
    args.registerDrain(drain);
  });

  if (args.devUrl) {
    await win.loadURL(`${args.devUrl}/install.html`);
  } else {
    await win.loadFile(path.join(__dirname, '..', 'renderer', 'install.html'));
  }
}

export function installSessionForEvent(event: IpcMainInvokeEvent): CliInstallSession | null {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  return recordsByWindowId.get(win.id)?.session ?? null;
}

export async function readInstallMarkerForEvent(
  event: IpcMainInvokeEvent,
): Promise<CliInstallMarkerReadResult> {
  const win = BrowserWindow.fromWebContents(event.sender);
  const record = win ? recordsByWindowId.get(win.id) : null;
  if (!record) return { exists: false };
  try {
    const content = await fs.readFile(record.session.markerPath, 'utf8');
    return { exists: true, content };
  } catch {
    return { exists: false };
  }
}

export async function finishInstallForEvent(event: IpcMainInvokeEvent, exitCode: number): Promise<void> {
  const win = BrowserWindow.fromWebContents(event.sender);
  const record = win ? recordsByWindowId.get(win.id) : null;
  if (!record) return;

  const detection = exitCode === 0
    ? await detectCli(record.session.kind, { force: true })
    : undefined;

  const eventPayload: CliInstallCompletedEvent = {
    kind: record.session.kind,
    exitCode,
    detection,
  };
  if (!record.opener.isDestroyed()) {
    record.opener.webContents.send(IPC.cliInstallCompleted, eventPayload);
  }

  if (exitCode === 0) {
    await fs.rm(record.session.markerPath, { force: true });
    if (record.session.scriptPath) await fs.rm(record.session.scriptPath, { force: true });
    record.window.close();
  }
}

async function createWindowsInstallScript(kind: CliKind, displayCommand: string, markerPath: string): Promise<string> {
  const spec = windowsInstallSpec(kind);
  const scriptPath = path.join(os.tmpdir(), `agentgrid-cli-install-${randomUUID()}.ps1`);
  const script = [
    '$ErrorActionPreference = "Continue"',
    '$global:LASTEXITCODE = $null',
    `$exe = ${psString(spec.exe)}`,
    `$cmdArgs = @(${spec.args.map(psString).join(', ')})`,
    `$markerPath = ${psString(markerPath)}`,
    `Write-Host ${psString(`Running: ${displayCommand}`)}`,
    'try {',
    '  & $exe @cmdArgs',
    '  $ok = $?',
    '  $code = $global:LASTEXITCODE',
    '  if ($null -eq $code) {',
    '    if ($ok) { $code = 0 } else { $code = 1 }',
    '  }',
    '} catch {',
    '  $code = 1',
    '  Write-Error $_',
    '}',
    'Set-Content -LiteralPath $markerPath -Value ([string]$code) -NoNewline',
    'exit ([int]$code)',
    '',
  ].join('\r\n');
  await fs.writeFile(scriptPath, script, 'utf8');
  return scriptPath;
}

function windowsInstallSpec(kind: CliKind): { exe: string; args: string[] } {
  switch (kind) {
    case 'codex':
      return { exe: 'npm.cmd', args: ['install', '-g', '@openai/codex'] };
    case 'claude':
      return { exe: 'npm.cmd', args: ['install', '-g', '@anthropic-ai/claude-code'] };
    case 'gemini':
      return { exe: 'npm.cmd', args: ['install', '-g', '@google/gemini-cli'] };
  }
}

function psString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function currentInstallPlatform(): 'win32' | 'darwin' | 'linux' | null {
  if (process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux') {
    return process.platform;
  }
  return null;
}
