import os from 'node:os';
import process from 'node:process';

// Pick a sensible interactive shell per platform. No CLI launch logic here —
// this spike only proves the PTY transport works against the user's real shell.
export function resolveShell(): { file: string; args: string[] } {
  if (process.platform === 'win32') {
    return { file: 'powershell.exe', args: [] };
  }

  // POSIX: honor $SHELL, fall back to the account's login shell, then /bin/bash.
  const envShell = process.env.SHELL?.trim();
  if (envShell) return { file: envShell, args: ['-l'] };

  try {
    const info = os.userInfo();
    const maybeShell = (info as unknown as { shell?: string }).shell;
    if (maybeShell) return { file: maybeShell, args: ['-l'] };
  } catch {
    // ignore
  }
  return { file: '/bin/bash', args: ['-l'] };
}

export function resolveCwd(): string {
  return os.homedir() || process.cwd();
}
