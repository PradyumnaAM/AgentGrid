import path from 'path';
import fs from 'fs/promises';
import type { TreeItem } from '@/lib/types';

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace');

export async function ensureWorkspace() {
  try {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  } catch {}
}

function resolvePath(filePath: string): string {
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const resolved = path.resolve(WORKSPACE_DIR, normalized);

  if (!resolved.startsWith(WORKSPACE_DIR)) {
    throw new Error('Path traversal detected');
  }

  return resolved;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

export async function createFile(filePath: string, content: string): Promise<string> {
  await ensureWorkspace();
  const resolved = resolvePath(filePath);
  if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE) {
    throw new Error('File content exceeds 1 MB limit');
  }
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, 'utf-8');
  return `File created: ${filePath}`;
}

export async function readDir(dirPath: string): Promise<string> {
  await ensureWorkspace();
  const resolved = resolvePath(dirPath);
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  const lines = entries.map((e) => (e.isDirectory() ? `[DIR]  ${e.name}/` : `[FILE] ${e.name}`));
  return lines.join('\n') || 'Directory is empty';
}

export async function readFile(filePath: string): Promise<string> {
  await ensureWorkspace();
  const resolved = resolvePath(filePath);
  const stat = await fs.stat(resolved);
  if (stat.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds 1 MB read limit');
  }
  const content = await fs.readFile(resolved, 'utf-8');
  return content;
}

export async function searchFiles(query: string, dirPath: string = '.', searchContent = false): Promise<string> {
  await ensureWorkspace();
  const resolved = resolvePath(dirPath);
  const results: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = path.relative(WORKSPACE_DIR, fullPath);
        if (entry.name.toLowerCase().includes(query.toLowerCase())) {
          results.push(relPath);
        } else if (searchContent) {
          try {
            const stat = await fs.stat(fullPath);
            if (stat.size <= MAX_FILE_SIZE) {
              const content = await fs.readFile(fullPath, 'utf-8');
              if (content.toLowerCase().includes(query.toLowerCase())) {
                results.push(`${relPath} (content match)`);
              }
            }
          } catch {
            // skip unreadable files
          }
        }
      }
    }
  }

  await walk(resolved);
  return results.length > 0 ? results.join('\n') : 'No matches found';
}

export async function getTree(dirPath: string = '.'): Promise<TreeItem[]> {
  await ensureWorkspace();
  const resolved = resolvePath(dirPath);
  return buildTree(resolved, WORKSPACE_DIR);
}

async function buildTree(dirPath: string, rootDir: string): Promise<TreeItem[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: TreeItem[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        type: 'dir',
        path: relativePath,
        children: await buildTree(fullPath, rootDir),
      });
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      items.push({
        name: entry.name,
        type: 'file',
        path: relativePath,
        size: stat.size,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function editFile(filePath: string, oldString: string, newString: string): Promise<string> {
  await ensureWorkspace();
  const resolved = resolvePath(filePath);
  const content = await fs.readFile(resolved, 'utf-8');

  if (!content.includes(oldString)) {
    throw new Error('oldString not found in file');
  }

  const updated = content.replace(oldString, newString);
  await fs.writeFile(resolved, updated, 'utf-8');
  return `File edited: ${filePath}`;
}
