import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

import type { CliInstallSession } from '../shared/ipc';

const terminalHost = document.getElementById('install-terminal') as HTMLElement | null;
const titleEl = document.getElementById('install-title') as HTMLElement | null;
const statusEl = document.getElementById('install-status') as HTMLElement | null;

if (!terminalHost) throw new Error('install-terminal missing');

const POLL_MS = 400;

function cssToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function cssTokenNumber(name: string): number {
  return Number.parseFloat(cssToken(name));
}

let session: CliInstallSession | null = null;
let ptyId: string | null = null;
let resolved = false;
let pollTimer = 0;

const term = new Terminal({
  cursorBlink: true,
  fontFamily: cssToken('--font-family-code'),
  fontSize: cssTokenNumber('--font-size-13'),
  lineHeight: cssTokenNumber('--line-height-ui'),
  scrollback: 5000,
  theme: {
    background: cssToken('--color-terminal-bg'),
    foreground: cssToken('--color-terminal-fg'),
    cursor: cssToken('--color-terminal-cursor'),
    selectionBackground: cssToken('--color-selection'),
  },
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(terminalHost);

term.onData((data) => {
  if (ptyId && !resolved) void window.agentgridPty.write(ptyId, data);
});

window.addEventListener('resize', fit);

void start();

async function start(): Promise<void> {
  const cli = window.agentgridCli;
  if (!cli) {
    setStatus('CLI bridge unavailable');
    return;
  }

  session = await cli.installSession();
  if (!session) {
    setStatus('missing install session');
    return;
  }

  if (titleEl) titleEl.textContent = `Install ${session.kind}`;
  setStatus(`running ${session.command}`);

  const size = safeSize();
  const spawned = await window.agentgridPty.spawn({
    paneId: `install:${session.id}`,
    cols: size.cols,
    rows: size.rows,
    assignment: 'shell',
    context: 'native',
  });

  if (!spawned || 'error' in spawned) {
    setStatus(spawned && 'error' in spawned ? spawned.error : 'could not start install terminal');
    return;
  }

  ptyId = spawned.id;
  window.agentgridPty.onData((evt) => {
    if (evt.id !== ptyId) return;
    term.write(evt.data);
  });
  window.agentgridPty.onExit((evt) => {
    if (evt.id !== ptyId || resolved) return;
    setStatus(`terminal exited before install completed: ${evt.exitCode}`);
  });

  fit();
  pollTimer = window.setInterval(() => void pollMarker(), POLL_MS);
  setTimeout(() => {
    if (!session || !ptyId) return;
    void window.agentgridPty.write(ptyId, `${buildInstallLine(session.command, session.markerPath)}\r`);
  }, 300);
}

async function pollMarker(): Promise<void> {
  const cliBridge = window.agentgridCli;
  if (!session || resolved || !cliBridge) return;
  const marker = await cliBridge.readInstallMarker();
  if (!marker.exists) return;

  const raw = (marker.content ?? '').trim();
  const exitCode = /^-?\d+$/.test(raw) ? parseInt(raw, 10) : 1;
  resolved = true;
  window.clearInterval(pollTimer);
  setStatus(exitCode === 0 ? 'install succeeded; closing...' : `install failed: exit ${exitCode}`);
  await cliBridge.finishInstall(exitCode);
}

function buildInstallLine(command: string, markerPath: string): string {
  const cli = window.agentgridCli;
  if (!cli) return '';

  if (cli.platform() === 'win32') {
    if (!session?.scriptPath) {
      return `Write-Error 'Missing generated install script'; Set-Content -LiteralPath ${psSingle(markerPath)} -Value 1 -NoNewline`;
    }
    return `powershell.exe -NoLogo -ExecutionPolicy Bypass -File ${psDouble(session.scriptPath)}`;
  }
  return `${command}; ag_exit=$?; printf "%s" "$ag_exit" > ${shSingle(markerPath)}`;
}

function psSingle(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function psDouble(value: string): string {
  return `"${value.replace(/"/g, '`"')}"`;
}

function shSingle(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function fit(): void {
  try {
    fitAddon.fit();
    if (ptyId) void window.agentgridPty.resize(ptyId, term.cols, term.rows);
  } catch {
    // hidden/early layout
  }
}

function safeSize(): { cols: number; rows: number } {
  try {
    fitAddon.fit();
  } catch {
    // ignore
  }
  return {
    cols: Math.max(1, term.cols || 100),
    rows: Math.max(1, term.rows || 30),
  };
}

function setStatus(text: string): void {
  if (statusEl) statusEl.textContent = text;
}
