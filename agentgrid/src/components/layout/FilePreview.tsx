'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, X } from 'lucide-react';

interface FilePreviewProps {
  filePath: string | null;
  onClose: () => void;
}

export function FilePreview({ filePath, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) return;

    const fetchFile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/tools/read_file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filePath }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setContent(data.result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read file');
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [filePath]);

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
      py: 'python', rs: 'rust', go: 'go', json: 'json',
      css: 'css', html: 'html', md: 'markdown', yaml: 'yaml', yml: 'yaml',
      toml: 'toml', sh: 'bash', sql: 'sql',
    };
    return map[ext || ''] || '';
  };

  return (
    <Sheet open={!!filePath} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-[640px] border-l border-zinc-800 bg-zinc-950 text-white sm:w-[720px]">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4 text-violet-400" />
            {filePath}
          </SheetTitle>
          {getLanguage(filePath || '') && (
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {getLanguage(filePath || '')}
            </span>
          )}
        </SheetHeader>

        <div className="mt-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              Loading...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-800/30 bg-red-500/5 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && content !== null && (
            <ScrollArea className="h-[calc(100vh-12rem)] rounded-lg border border-zinc-800 bg-zinc-900/50">
              <pre className="p-4 text-sm font-mono text-zinc-300 whitespace-pre-wrap break-words">
                {content}
              </pre>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
