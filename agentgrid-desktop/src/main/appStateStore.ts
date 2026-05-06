import fs from 'node:fs/promises';
import path from 'node:path';

import {
  APP_STATE_VERSION,
  DEFAULT_APP_STATE,
  type AppStatePatch,
  type PersistedAppState,
  type RecentWorkspaceEntry,
  type WorkspaceLaunchConfig,
  type WorkspacePreset,
} from '../shared/appState';
import type { PaneAssignment, WorkspaceSettings } from '../shared/workspace';

const STATE_FILE_NAME = 'app-state.json';
const MAX_RECENT_WORKSPACES = 20;
const VALID_ASSIGNMENTS: readonly PaneAssignment[] = ['shell', 'codex', 'claude', 'gemini'];
const VALID_PANE_COUNTS: readonly WorkspaceSettings['paneCount'][] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export class AppStateStore {
  private readonly filePath: string;
  private cachedState: PersistedAppState | null = null;

  constructor(userDataPath: string) {
    this.filePath = path.join(userDataPath, STATE_FILE_NAME);
  }

  async load(): Promise<PersistedAppState> {
    if (this.cachedState) return cloneState(this.cachedState);

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      this.cachedState = normalizeAppState(parsed);
    } catch (err) {
      if (!isMissingFileError(err)) {
        console.warn('Failed to read persisted AgentGrid app state; using defaults.', err);
      }
      this.cachedState = normalizeAppState(null);
    }

    return cloneState(this.cachedState);
  }

  async save(state: unknown): Promise<PersistedAppState> {
    const nextState = touchState(normalizeAppState(state));
    await this.write(nextState);
    this.cachedState = nextState;
    return cloneState(nextState);
  }

  async patch(patch: unknown): Promise<PersistedAppState> {
    const currentState = await this.load();
    const nextState = touchState(applyPatch(currentState, patch));
    await this.write(nextState);
    this.cachedState = nextState;
    return cloneState(nextState);
  }

  private async write(state: PersistedAppState): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const json = `${JSON.stringify(state, null, 2)}\n`;
    await fs.writeFile(tempPath, json, 'utf8');
    await fs.rename(tempPath, this.filePath);
  }
}

function applyPatch(currentState: PersistedAppState, patch: unknown): PersistedAppState {
  if (!isRecord(patch)) return currentState;

  const typedPatch = patch as AppStatePatch;
  const merged: PersistedAppState = {
    ...currentState,
    launcherDefaults: typedPatch.launcherDefaults
      ? normalizeLauncherDefaults(typedPatch.launcherDefaults, currentState.launcherDefaults)
      : currentState.launcherDefaults,
    terminalSettings: typedPatch.terminalSettings
      ? normalizeTerminalSettings(typedPatch.terminalSettings, currentState.terminalSettings)
      : currentState.terminalSettings,
    lastWorkspaceLaunch:
      'lastWorkspaceLaunch' in patch
        ? normalizeWorkspaceLaunchConfig(typedPatch.lastWorkspaceLaunch, null)
        : currentState.lastWorkspaceLaunch,
    recentWorkspaces: typedPatch.recentWorkspaces
      ? normalizeRecentWorkspaces(typedPatch.recentWorkspaces)
      : currentState.recentWorkspaces,
    presets: typedPatch.presets
      ? normalizePresets(typedPatch.presets)
      : currentState.presets,
  };

  return normalizeAppState(merged);
}

function normalizeAppState(raw: unknown): PersistedAppState {
  const defaults = cloneState(DEFAULT_APP_STATE);
  if (!isRecord(raw)) {
    return touchState(defaults, false);
  }

  return {
    version: APP_STATE_VERSION,
    launcherDefaults: normalizeLauncherDefaults(raw.launcherDefaults, defaults.launcherDefaults),
    terminalSettings: normalizeTerminalSettings(raw.terminalSettings, defaults.terminalSettings),
    lastWorkspaceLaunch: normalizeWorkspaceLaunchConfig(raw.lastWorkspaceLaunch, null),
    recentWorkspaces: normalizeRecentWorkspaces(raw.recentWorkspaces),
    presets: normalizePresets(raw.presets),
    updatedAt: normalizeTimestamp(raw.updatedAt, defaults.updatedAt),
  };
}

function normalizeLauncherDefaults(
  raw: unknown,
  fallback: PersistedAppState['launcherDefaults'],
): PersistedAppState['launcherDefaults'] {
  if (!isRecord(raw)) {
    return { ...fallback, assignments: [...fallback.assignments] };
  }
  return {
    selectedFolder: normalizeOptionalPath(raw.selectedFolder, fallback.selectedFolder),
    paneCount: normalizePaneCount(raw.paneCount, fallback.paneCount),
    bulkAssignment: normalizeOptionalAssignment(raw.bulkAssignment, fallback.bulkAssignment),
    assignments: normalizeAssignments(raw.assignments, fallback.assignments),
  };
}

function normalizeTerminalSettings(
  raw: unknown,
  fallback: PersistedAppState['terminalSettings'],
): PersistedAppState['terminalSettings'] {
  if (!isRecord(raw)) return { ...fallback };
  return {
    fontSize: normalizeNumber(raw.fontSize, fallback.fontSize, 8, 40),
    fontFamily: normalizeString(raw.fontFamily, fallback.fontFamily, 160),
    copyOnSelect: normalizeBoolean(raw.copyOnSelect, fallback.copyOnSelect),
    pasteConfirmForLargeText: normalizeBoolean(
      raw.pasteConfirmForLargeText,
      fallback.pasteConfirmForLargeText,
    ),
  };
}

function normalizeWorkspaceLaunchConfig(
  raw: unknown,
  fallback: WorkspaceLaunchConfig | null,
): WorkspaceLaunchConfig | null {
  if (raw === null) return null;
  if (!isRecord(raw)) return fallback ? { ...fallback, assignments: [...fallback.assignments] } : null;

  const folder = normalizeRequiredString(raw.folder, fallback?.folder ?? '', 2048);
  if (!folder) return fallback ? { ...fallback, assignments: [...fallback.assignments] } : null;

  const launchContext =
    raw.launchContext === 'native' || raw.launchContext === 'wsl'
      ? raw.launchContext
      : fallback?.launchContext;

  return {
    folder,
    paneCount: normalizePaneCount(raw.paneCount, fallback?.paneCount ?? DEFAULT_APP_STATE.launcherDefaults.paneCount),
    bulkAssignment: normalizeOptionalAssignment(
      raw.bulkAssignment,
      fallback?.bulkAssignment ?? DEFAULT_APP_STATE.launcherDefaults.bulkAssignment,
    ),
    assignments: normalizeAssignments(
      raw.assignments,
      fallback?.assignments ?? DEFAULT_APP_STATE.launcherDefaults.assignments,
    ),
    ...(launchContext ? { launchContext } : {}),
    launchedAt: normalizeTimestamp(raw.launchedAt, fallback?.launchedAt ?? Date.now()),
  };
}

function normalizeRecentWorkspaces(raw: unknown): RecentWorkspaceEntry[] {
  if (!Array.isArray(raw)) return [];

  const byFolder = new Map<string, RecentWorkspaceEntry>();
  for (const item of raw) {
    const entry = normalizeRecentWorkspaceEntry(item);
    if (!entry) continue;
    const existing = byFolder.get(entry.folder);
    if (!existing || entry.lastLaunchedAt >= existing.lastLaunchedAt) {
      byFolder.set(entry.folder, entry);
    }
  }

  return [...byFolder.values()]
    .sort((a, b) => b.lastLaunchedAt - a.lastLaunchedAt)
    .slice(0, MAX_RECENT_WORKSPACES);
}

function normalizeRecentWorkspaceEntry(raw: unknown): RecentWorkspaceEntry | null {
  if (!isRecord(raw)) return null;
  const folder = normalizeRequiredString(raw.folder, '', 2048);
  if (!folder) return null;

  const fallbackName = path.basename(folder) || folder;
  return {
    folder,
    name: normalizeString(raw.name, fallbackName, 160),
    lastLaunchedAt: normalizeTimestamp(raw.lastLaunchedAt, Date.now()),
    paneCount: normalizePaneCount(raw.paneCount, DEFAULT_APP_STATE.launcherDefaults.paneCount),
    bulkAssignment: normalizeOptionalAssignment(
      raw.bulkAssignment,
      DEFAULT_APP_STATE.launcherDefaults.bulkAssignment,
    ),
    assignments: normalizeAssignments(raw.assignments, DEFAULT_APP_STATE.launcherDefaults.assignments),
  };
}

function normalizePresets(raw: unknown): WorkspacePreset[] {
  if (!Array.isArray(raw)) return [];
  const result: WorkspacePreset[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = normalizeRequiredString(item.id, '', 128);
    if (!id) continue;
    const name = normalizeString(item.name, 'Preset', 80);
    const paneCount = normalizePaneCount(item.paneCount, DEFAULT_APP_STATE.launcherDefaults.paneCount);
    const assignments = normalizeAssignments(item.assignments, DEFAULT_APP_STATE.launcherDefaults.assignments);
    const createdAt = normalizeTimestamp(item.createdAt, Date.now());
    result.push({ id, name, paneCount, assignments, createdAt });
  }
  return result;
}

function normalizeAssignments(raw: unknown, fallback: PaneAssignment[]): PaneAssignment[] {
  if (!Array.isArray(raw)) return [...fallback];
  const assignments = raw.filter(isPaneAssignment).slice(0, 10);
  return assignments.length > 0 ? assignments : [...fallback];
}

function isPaneAssignment(value: unknown): value is PaneAssignment {
  return typeof value === 'string' && (VALID_ASSIGNMENTS as readonly string[]).includes(value);
}

function normalizePaneCount(raw: unknown, fallback: WorkspaceSettings['paneCount']): WorkspaceSettings['paneCount'] {
  return typeof raw === 'number' && (VALID_PANE_COUNTS as readonly number[]).includes(raw)
    ? (raw as WorkspaceSettings['paneCount'])
    : fallback;
}

function normalizeOptionalPath(raw: unknown, fallback: string | null): string | null {
  if (raw === null) return null;
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, 2048) : null;
}

function normalizeOptionalAssignment(raw: unknown, fallback: PaneAssignment | null): PaneAssignment | null {
  if (raw === null) return null;
  if (typeof raw !== 'string') return fallback;
  return isPaneAssignment(raw) ? raw : fallback;
}

function normalizeRequiredString(raw: unknown, fallback: string, maxLength: number): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizeString(raw: unknown, fallback: string, maxLength: number): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizeNumber(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

function normalizeBoolean(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback;
}

function normalizeTimestamp(raw: unknown, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return fallback;
  return Math.round(raw);
}

function touchState(state: PersistedAppState, updateTimestamp = true): PersistedAppState {
  return {
    ...state,
    version: APP_STATE_VERSION,
    updatedAt: updateTimestamp ? Date.now() : state.updatedAt,
  };
}

function cloneState<T extends PersistedAppState>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissingFileError(err: unknown): boolean {
  return isRecord(err) && err.code === 'ENOENT';
}
