import { app, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { AuthStatus, AuthUserSummary } from '../shared/ipc';

interface StoredAuthSession {
  encryptedToken: string;
  user: AuthUserSummary;
  expiresAt: string;
}

export interface AuthSessionInput {
  token: string;
  user: AuthUserSummary;
  expiresAt: string;
}

let memorySession: AuthSessionInput | null = null;
const DEFAULT_DEV_ACCOUNT_URL = 'http://127.0.0.1:3000';
const PACKAGED_ACCOUNT_URL_ENV = 'AGENTGRID_PACKAGED_ACCOUNT_URL';

function sessionPath(): string {
  return path.join(app.getPath('userData'), 'auth-session.json');
}

export function accountUrl(): string {
  const configured = process.env.AGENTGRID_ACCOUNT_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (!app.isPackaged) return DEFAULT_DEV_ACCOUNT_URL;

  const packagedUrl = process.env[PACKAGED_ACCOUNT_URL_ENV]?.trim();
  if (packagedUrl) return packagedUrl.replace(/\/+$/, '');

  throw new Error(`${PACKAGED_ACCOUNT_URL_ENV} must be set for packaged desktop auth`);
}

export function secureStorageState(): AuthStatus['secureStorage'] {
  if (!safeStorage.isEncryptionAvailable()) {
    return { available: false, reason: 'OS secure storage is not available' };
  }
  if (process.platform === 'linux') {
    const backend = safeStorage.getSelectedStorageBackend();
    if (backend === 'basic_text') {
      return { available: false, reason: 'Linux secret service is unavailable; refusing plaintext token persistence' };
    }
  }
  return { available: true };
}

export async function loadAuthSession(): Promise<AuthSessionInput | null> {
  if (memorySession && !isExpired(memorySession.expiresAt)) return memorySession;
  const secure = secureStorageState();
  if (!secure.available) return null;

  try {
    const raw = await fs.readFile(sessionPath(), 'utf8');
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (!parsed.encryptedToken || !parsed.user || !parsed.expiresAt || isExpired(parsed.expiresAt)) {
      await clearAuthSession();
      return null;
    }
    const token = safeStorage.decryptString(Buffer.from(parsed.encryptedToken, 'base64'));
    memorySession = { token, user: parsed.user, expiresAt: parsed.expiresAt };
    return memorySession;
  } catch {
    return null;
  }
}

export async function saveAuthSession(input: AuthSessionInput): Promise<void> {
  memorySession = input;
  const secure = secureStorageState();
  if (!secure.available) return;

  await fs.mkdir(path.dirname(sessionPath()), { recursive: true });
  const encryptedToken = safeStorage.encryptString(input.token).toString('base64');
  const stored: StoredAuthSession = {
    encryptedToken,
    user: input.user,
    expiresAt: input.expiresAt,
  };
  await fs.writeFile(sessionPath(), JSON.stringify(stored, null, 2), { encoding: 'utf8', mode: 0o600 });
}

export async function clearAuthSession(): Promise<void> {
  memorySession = null;
  await fs.rm(sessionPath(), { force: true });
}

export async function authStatus(): Promise<AuthStatus> {
  const session = await loadAuthSession();
  const secureStorage = secureStorageState();
  return {
    signedIn: Boolean(session),
    user: session?.user ?? null,
    expiresAt: session?.expiresAt ?? null,
    accountUrl: accountUrl(),
    secureStorage,
  };
}

function isExpired(expiresAt: string): boolean {
  const time = Date.parse(expiresAt);
  return !Number.isFinite(time) || time <= Date.now();
}
