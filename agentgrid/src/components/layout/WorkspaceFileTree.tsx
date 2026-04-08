'use client';

import { useEffect, useState } from 'react';
import type { TreeItem } from '@/lib/types';
import { Folder, FolderOpen, RefreshCw, FileCode, FileText, FileJson, FileType, File } from 'lucide-react';

interface WorkspaceFileTreeProps {
  onFileSelect?: (path: string) => void;
  refreshTrigger?: number;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  const codeExts = new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'sh', 'css', 'html', 'sql']);
  const textExts = new Set(['md', 'txt', 'yaml', 'yml', 'toml', 'env']);
  if (ext && codeExts.has(ext)) return <FileCode className="h-3 w-3 text-violet-400/70 shrink-0" />;
  if (ext === 'json') return <FileJson className="h-3 w-3 text-amber-400/70 shrink-0" />;
  if (ext && textExts.has(ext)) return <FileText className="h-3 w-3 text-zinc-400/70 shrink-0" />;
  return <File className="h-3 w-3 text-zinc-600 shrink-0" />;
}

export function WorkspaceFileTree({ onFileSelect, refreshTrigger }: WorkspaceFileTreeProps) {
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/workspace/tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '.' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTree(data.tree || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTree(); }, [refreshTrigger]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleFileSelect = (path: string) => {
    setSelected(path);
    onFileSelect?.(path);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const renderTree = (items: TreeItem[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = expanded.has(item.path);
      const indent = depth * 12;

      if (item.type === 'dir') {
        return (
          <div key={item.path}>
            <button
              onClick={() => toggle(item.path)}
              className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              style={{ paddingLeft: indent + 8 }}
            >
              {isExpanded
                ? <FolderOpen className="h-3 w-3 text-amber-400/80 shrink-0" />
                : <Folder className="h-3 w-3 text-amber-400/60 shrink-0" />
              }
              <span className="truncate font-medium">{item.name}</span>
              {item.children && item.children.length > 0 && (
                <span className="ml-auto text-[10px] text-zinc-700">{item.children.length}</span>
              )}
            </button>
            {isExpanded && item.children && (
              <div className="border-l border-zinc-800/60 ml-4">
                {renderTree(item.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      const isSelected = selected === item.path;
      return (
        <button
          key={item.path}
          onClick={() => handleFileSelect(item.path)}
          className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs transition-colors ${
            isSelected
              ? 'bg-violet-500/10 text-violet-300'
              : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
          }`}
          style={{ paddingLeft: indent + 8 }}
        >
          {getFileIcon(item.name)}
          <span className="truncate flex-1">{item.name}</span>
          {item.size !== undefined && (
            <span className="text-[10px] text-zinc-700">{formatSize(item.size)}</span>
          )}
        </button>
      );
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Workspace</span>
        <button
          onClick={fetchTree}
          className="rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 transition-colors disabled:opacity-40"
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-1.5">
        {loading && tree.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="h-4 w-4 animate-spin text-zinc-700" />
          </div>
        )}

        {!loading && error && (
          <p className="px-3 py-4 text-xs text-red-400">{error}</p>
        )}

        {!loading && !error && tree.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-zinc-600">Workspace is empty</p>
            <p className="mt-1 text-[11px] text-zinc-700">Files created by agents appear here</p>
          </div>
        )}

        {!loading && tree.length > 0 && renderTree(tree)}
      </div>
    </div>
  );
}
