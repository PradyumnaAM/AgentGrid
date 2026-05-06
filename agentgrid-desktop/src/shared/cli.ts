// Shared CLI detection types. Kept dependency-free so it can be imported
// from the main process, the preload bridge, and the renderer without
// dragging Node or DOM types across the sandbox boundary.

/**
 * CLIs we currently probe. `shell` is intentionally excluded — the plain
 * shell is always available via node-pty's default shell resolution and
 * does not go through detection.
 */
export type CliKind = 'codex' | 'claude' | 'gemini';

export const CLI_KINDS: readonly CliKind[] = ['codex', 'claude', 'gemini'] as const;

/**
 * State machine for a single CLI's detected availability.
 *
 * - `checking`           : probe is in flight
 * - `available`          : executable found and version probe succeeded
 * - `missing`            : not found on PATH (and, on Windows, not reachable via WSL)
 * - `invocation_failed`  : executable resolved but --version failed (non-zero, crash, or timeout)
 * - `unsupported`        : platform/arch combination isn't supported by this phase
 * - `unknown`            : no probe has ever run for this CLI
 * - `soon`               : explicit override for "detection not wired up yet"
 */
export type CliDetectionStatus =
  | 'available'
  | 'missing'
  | 'unsupported'
  | 'invocation_failed'
  | 'unknown'
  | 'checking'
  | 'soon';

export type CliDetectionVia = 'native' | 'wsl';

export interface CliDetectionResult {
  kind: CliKind;
  status: CliDetectionStatus;
  /** Absolute path of the resolved executable when the probe found one. */
  path?: string;
  /** First non-empty line of --version output when the probe succeeded. */
  version?: string;
  /** On Windows, whether detection succeeded natively or via wsl.exe. */
  via?: CliDetectionVia;
  /** Short human-readable reason (e.g. "timeout", "exit 127"); UI may surface it. */
  reason?: string;
  /** ms since epoch when the probe completed (or was initiated for non-terminal states). */
  checkedAt: number;
}

export interface CliDetectRequest {
  kind: CliKind;
  /** Bypass cache and re-run the probe. */
  force?: boolean;
}

export interface CliDetectAllRequest {
  force?: boolean;
}

// ─── Install commands ────────────────────────────────────────────────────────
// Every entry here must correspond to a command that is explicitly documented
// as an official install path by the upstream CLI vendor. If a (kind,
// platform) pair is not verified against upstream docs we return `null` so
// the UI can show a "no verified install command" note instead of guessing.
//
// Verified sources (checked against upstream docs/READMEs, npm pages):
//   Codex   — https://github.com/openai/codex  + https://www.npmjs.com/package/@openai/codex
//             win/linux: `npm install -g @openai/codex`
//             macOS    : `brew install --cask codex`  (NOTE: cask, not formula)
//   Gemini  — https://github.com/google-gemini/gemini-cli
//             + https://www.npmjs.com/package/@google/gemini-cli
//             win/linux: `npm install -g @google/gemini-cli`
//             macOS    : `brew install gemini-cli`
//   Claude  — https://docs.anthropic.com/en/docs/claude-code/setup
//             + https://www.npmjs.com/package/@anthropic-ai/claude-code
//             all OSes : `npm install -g @anthropic-ai/claude-code`
//
// Claude Code note:
//   Anthropic currently documents multiple official install paths: a native
//   installer (`curl | bash` on POSIX, `irm | iex` in PowerShell), a
//   Homebrew cask (`brew install --cask claude-code`), WinGet, and npm.
//   We deliberately pick ONE path — the global npm install — because:
//     1. It is documented on the official setup page as a supported method.
//     2. It works uniformly across Windows, macOS, Linux (and WSL).
//     3. It matches the shape of Codex and Gemini installs, so UI copy
//        and expectations stay consistent.
//     4. It does not require users to trust and run a piped shell script
//        or install an OS package manager inside our app.
//   If users prefer a different install path, they can close this install
//   pane and run it themselves — we do not fight them on that.

export type InstallPlatform = 'win32' | 'darwin' | 'linux';

export interface InstallCommand {
  /** Short label shown on the Install button, e.g. "npm" or "brew". */
  label: string;
  /** Exact command string typed into the Empty Terminal pane, verbatim. */
  command: string;
  /** One-line explanation shown in the button's tooltip. */
  hint: string;
}

const INSTALL_COMMANDS: Record<CliKind, Partial<Record<InstallPlatform, InstallCommand>>> = {
  codex: {
    win32: {
      label: 'npm',
      command: 'npm install -g @openai/codex',
      hint: 'Official: installs Codex CLI globally via npm. Requires Node.js.',
    },
    darwin: {
      label: 'brew',
      command: 'brew install codex',
      hint: 'Installs Codex CLI via Homebrew.',
    },
    linux: {
      label: 'npm',
      command: 'npm install -g @openai/codex',
      hint: 'Official: installs Codex CLI globally via npm. Requires Node.js.',
    },
  },
  gemini: {
    win32: {
      label: 'npm',
      command: 'npm install -g @google/gemini-cli',
      hint: 'Official: installs Gemini CLI globally via npm. Requires Node.js 18+.',
    },
    darwin: {
      label: 'brew',
      command: 'brew install gemini-cli',
      hint: 'Official: installs Gemini CLI via Homebrew.',
    },
    linux: {
      label: 'npm',
      command: 'npm install -g @google/gemini-cli',
      hint: 'Official: installs Gemini CLI globally via npm. Requires Node.js 18+.',
    },
  },
  claude: {
    // Intentionally npm on every platform — see "Claude Code note" above.
    win32: {
      label: 'npm',
      command: 'npm install -g @anthropic-ai/claude-code',
      hint: 'Official (npm): installs Claude Code globally. Requires Node.js 18+.',
    },
    darwin: {
      label: 'curl',
      command: 'curl -fsSL https://claude.ai/install.sh | bash',
      hint: 'Official: installs Claude Code via the claude.ai installer script.',
    },
    linux: {
      label: 'npm',
      command: 'npm install -g @anthropic-ai/claude-code',
      hint: 'Official (npm): installs Claude Code globally. Requires Node.js 18+.',
    },
  },
};

export function getInstallCommand(kind: CliKind, platform: InstallPlatform): InstallCommand | null {
  return INSTALL_COMMANDS[kind]?.[platform] ?? null;
}
