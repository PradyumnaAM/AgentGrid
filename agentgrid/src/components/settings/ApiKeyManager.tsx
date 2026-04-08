'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAgentStore, type ApiKeyEntry, type LlmConfig } from '@/store/useAgentStore';
import {
  Key, Eye, EyeOff, Trash2, CheckCircle, AlertCircle,
  Loader2, Sparkles, Plus, ChevronDown, ChevronUp, Star,
} from 'lucide-react';

// ── Reusable key form ────────────────────────────────────────────────────────

interface KeyFormState {
  name: string;
  provider: 'openai' | 'openai_compatible';
  apiKey: string;
  model: string;
  baseUrl: string;
}

const emptyForm = (): KeyFormState => ({
  name: '',
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  baseUrl: '',
});

function KeyForm({
  initial,
  onSave,
  onCancel,
  saveLabel = 'Save Key',
}: {
  initial?: KeyFormState;
  onSave: (form: KeyFormState, valid: boolean) => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const [form, setForm] = useState<KeyFormState>(initial ?? emptyForm());
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null);
  const [validationMessage, setValidationMessage] = useState('');

  const set = (patch: Partial<KeyFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setValidationResult(null);
  };

  const validate = async (): Promise<boolean> => {
    if (!form.apiKey.trim()) return false;
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmConfig: {
            provider: form.provider,
            apiKey: form.apiKey.trim(),
            model: form.model.trim(),
            baseUrl: form.baseUrl.trim(),
          },
        }),
      });
      if (res.ok) {
        setValidationResult('valid');
        setValidationMessage('Connection verified.');
        return true;
      }
      const payload = (await res.json()) as { error?: string };
      setValidationResult('invalid');
      setValidationMessage(payload.error || 'Invalid key or connection failed.');
      return false;
    } catch {
      setValidationResult('invalid');
      setValidationMessage('Network error while validating.');
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    const valid = await validate();
    if (!valid) return;
    onSave(form, valid);
  };

  const canSave =
    form.name.trim() &&
    form.apiKey.trim() &&
    form.model.trim() &&
    (form.provider === 'openai' || form.baseUrl.trim());

  return (
    <div className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Key name</label>
        <input
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Personal GPT-4o"
          className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Provider</label>
        <select
          value={form.provider}
          onChange={(e) => set({ provider: e.target.value as 'openai' | 'openai_compatible' })}
          className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none"
        >
          <option value="openai">OpenAI</option>
          <option value="openai_compatible">OpenAI-compatible</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">API key</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={form.apiKey}
            onChange={(e) => set({ apiKey: e.target.value })}
            placeholder="sk-..."
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:border-violet-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {validationResult === 'valid' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" />{validationMessage}</p>
        )}
        {validationResult === 'invalid' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" />{validationMessage}</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Model</label>
        <input
          value={form.model}
          onChange={(e) => set({ model: e.target.value })}
          placeholder={form.provider === 'openai' ? 'gpt-4o-mini' : 'provider/model-name'}
          className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-400 focus:outline-none"
        />
        {form.provider === 'openai' && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1'].map((p) => (
              <button key={p} type="button" onClick={() => set({ model: p })}
                className="rounded-full border border-white/15 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400 transition hover:bg-white/[0.08]">
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      {form.provider === 'openai_compatible' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Base URL</label>
          <input
            value={form.baseUrl}
            onChange={(e) => set({ baseUrl: e.target.value })}
            placeholder="https://api.openrouter.ai/v1"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-400 focus:outline-none"
          />
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-zinc-500 hover:text-zinc-300">
          Cancel
        </Button>
        <Button size="sm" onClick={validate} disabled={!form.apiKey.trim() || validating}
          className="border border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]">
          {validating ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Testing…</> : <><Sparkles className="mr-1 h-3 w-3" />Test</>}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!canSave || validating}
          className="flex-1 bg-violet-600 text-white hover:bg-violet-700">
          <CheckCircle className="mr-1 h-3 w-3" />
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

// ── Key row ──────────────────────────────────────────────────────────────────

function KeyRow({
  entry,
  isDefault,
  onSetDefault,
  onDelete,
}: {
  entry: ApiKeyEntry;
  isDefault: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const masked = entry.config.apiKey
    ? `${entry.config.apiKey.slice(0, 6)}${'•'.repeat(12)}${entry.config.apiKey.slice(-4)}`
    : '(no key)';

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition ${isDefault ? 'border-violet-400/30 bg-violet-500/8' : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-100">{entry.name}</span>
          <span className={`rounded-full border px-1.5 py-px text-[10px] ${entry.config.provider === 'openai' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300'}`}>
            {entry.config.provider === 'openai' ? 'OpenAI' : 'Compatible'}
          </span>
          {isDefault && (
            <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-1.5 py-px text-[10px] text-violet-300">
              default
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="font-mono">{masked}</span>
          <span>·</span>
          <span>{entry.config.model}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!isDefault && (
          <button onClick={onSetDefault} title="Set as default"
            className="rounded-lg border border-white/10 p-1.5 text-zinc-600 transition hover:border-violet-400/30 hover:text-violet-300">
            <Star className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onDelete} title="Delete"
          className="rounded-lg border border-white/10 p-1.5 text-zinc-600 transition hover:border-red-400/30 hover:text-red-400">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function ApiKeyManager() {
  const llmConfig = useAgentStore((s) => s.llmConfig);
  const settingsOpen = useAgentStore((s) => s.settingsOpen);
  const setSettingsOpen = useAgentStore((s) => s.setSettingsOpen);
  const setLlmConfig = useAgentStore((s) => s.setLlmConfig);
  const apiKeys = useAgentStore((s) => s.apiKeys);
  const addApiKey = useAgentStore((s) => s.addApiKey);
  const removeApiKey = useAgentStore((s) => s.removeApiKey);

  const [addingKey, setAddingKey] = useState(false);

  // Close add-form when sheet closes
  useEffect(() => {
    if (!settingsOpen) setAddingKey(false);
  }, [settingsOpen]);

  const handleAddKey = (form: KeyFormState) => {
    const config: LlmConfig = {
      provider: form.provider,
      apiKey: form.apiKey.trim(),
      model: form.model.trim(),
      baseUrl: form.baseUrl.trim(),
    };
    addApiKey({ id: `key-${Date.now()}`, name: form.name.trim(), config });
    setAddingKey(false);
    // Auto-set as global default if no key configured yet
    if (!llmConfig.apiKey) {
      setLlmConfig(config);
    }
  };

  const handleSetDefault = (entry: ApiKeyEntry) => {
    setLlmConfig(entry.config);
  };

  const isDefaultKey = (entry: ApiKeyEntry) =>
    entry.config.apiKey === llmConfig.apiKey &&
    entry.config.provider === llmConfig.provider &&
    entry.config.model === llmConfig.model;

  return (
    <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
      <SheetContent className="w-[440px] border-l border-white/10 bg-zinc-950/95 p-0 text-white backdrop-blur-2xl sm:w-[560px]">
        <SheetHeader>
          <div className="border-b border-white/10 px-6 py-5">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Key className="h-4 w-4 text-violet-300" />
              </div>
              API Keys &amp; Settings
            </SheetTitle>
            <p className="mt-1 text-sm text-zinc-500">
              Add multiple keys. Assign them per-agent when spawning. The starred key is the global default.
            </p>
          </div>
        </SheetHeader>

        <div className="space-y-5 overflow-auto p-6">
          {/* Key list */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">Saved keys</h3>
              <button
                onClick={() => setAddingKey(!addingKey)}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/[0.08]"
              >
                {addingKey ? <><ChevronUp className="h-3.5 w-3.5" />Cancel</> : <><Plus className="h-3.5 w-3.5" />Add key</>}
              </button>
            </div>

            {apiKeys.length === 0 && !addingKey && (
              <div className="rounded-xl border border-dashed border-white/10 py-6 text-center">
                <Key className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
                <p className="text-sm text-zinc-500">No keys saved yet.</p>
                <p className="mt-0.5 text-xs text-zinc-600">Click &quot;Add key&quot; to get started.</p>
              </div>
            )}

            <div className="space-y-2">
              {apiKeys.map((entry) => (
                <KeyRow
                  key={entry.id}
                  entry={entry}
                  isDefault={isDefaultKey(entry)}
                  onSetDefault={() => handleSetDefault(entry)}
                  onDelete={() => removeApiKey(entry.id)}
                />
              ))}
            </div>

            {addingKey && (
              <div className="mt-3">
                <KeyForm
                  onSave={handleAddKey}
                  onCancel={() => setAddingKey(false)}
                  saveLabel="Add Key"
                />
              </div>
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* Global default status */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="text-sm font-medium text-zinc-300">Global default</h4>
            <p className="mt-0.5 text-xs text-zinc-500">Used by agents that don&apos;t have their own key assigned.</p>
            <div className="mt-3 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${llmConfig.apiKey ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="text-xs text-zinc-400">
                {llmConfig.apiKey
                  ? `${llmConfig.provider === 'openai' ? 'OpenAI' : 'Compatible'} · ${llmConfig.model}`
                  : 'No default key — add a key above'}
              </span>
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="text-sm font-medium text-zinc-300">Security notes</h4>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              <li>• Keys are stored only in your browser&apos;s localStorage</li>
              <li>• Keys are sent directly to your chosen provider — never to AgentGrid servers</li>
              <li>• Clear your browser data to remove all stored keys</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
