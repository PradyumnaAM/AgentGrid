import type { CliDetectionResult, CliKind } from './cli';

export type AssistantAgentRole = 'writer' | 'reviewer' | 'tester' | 'explainer';
export type AgentMondayRole = AssistantAgentRole;

export type AgentMondayIntent =
  | 'implementation'
  | 'refactor'
  | 'bugfix'
  | 'test'
  | 'review'
  | 'architecture'
  | 'risk'
  | 'docs'
  | 'large-context'
  | 'exploration'
  | 'general';

export type AgentMondayPlanStatus = 'ready' | 'blocked';

export interface AssistantTaskRequest {
  prompt: string;
  selectedProjectFolder: string | null;
  cliDetections: readonly CliDetectionResult[];
}

export type AgentMondayRouteRequest = AssistantTaskRequest;

export interface AssistantRoute {
  cli: CliKind;
  role: AssistantAgentRole;
  intent: AgentMondayIntent;
  canWrite: boolean;
  reason: string;
  supervisedPrompt: string;
  requestedInstance?: number;
}

export type AgentMondayRoute = AssistantRoute;

export interface AssistantRoutePlan {
  status: AgentMondayPlanStatus;
  intent: AgentMondayIntent;
  task: string;
  selectedProjectFolder: string | null;
  availableClis: CliKind[];
  routes: AssistantRoute[];
  writerCli: CliKind | null;
  blockedReason?: string;
}

export type AgentMondayRoutePlan = AssistantRoutePlan;

interface RoleSelection {
  role: AssistantAgentRole;
  preferredCli: CliKind;
  canWrite: boolean;
  reason: string;
}

const CLI_ORDER: readonly CliKind[] = ['codex', 'claude', 'gemini'] as const;

const IMPLEMENTATION_TERMS = [
  'add',
  'build',
  'change',
  'code',
  'create',
  'edit',
  'fix',
  'implement',
  'make',
  'patch',
  'refactor',
  'test',
  'update',
  'write',
] as const;

const STRONG_IMPLEMENTATION_TERMS = [
  'add',
  'build',
  'change',
  'create',
  'edit',
  'fix',
  'implement',
  'make',
  'patch',
  'refactor',
  'update',
  'write',
] as const;

const REVIEW_TERMS = [
  'architecture',
  'audit',
  'plan',
  'planner',
  'review',
  'risk',
  'security',
  'threat',
] as const;

const EXPLORATION_TERMS = [
  'analyze',
  'docs',
  'document',
  'explore',
  'find',
  'large context',
  'large-context',
  'research',
  'search',
  'summarize',
] as const;

const AGENT_COUNT_WORDS: Record<string, number> = {
  one: 1,
  single: 1,
  solo: 1,
  two: 2,
  twice: 2,
  pair: 2,
  three: 3,
  trio: 3,
  four: 4,
  five: 5,
  six: 6,
};
const MAX_AGENT_ROUTES = 6;

export function buildAgentMondayRoutePlan(
  prompt: string,
  selectedProjectFolder: string | null,
  cliDetections: readonly CliDetectionResult[],
): AgentMondayRoutePlan {
  return buildAgentMondayRoutePlanFromRequest({
    prompt,
    selectedProjectFolder,
    cliDetections,
  });
}

export function buildAgentMondayRoutePlanFromRequest(
  request: AgentMondayRouteRequest,
): AgentMondayRoutePlan {
  const task = normalizeTask(request.prompt);
  const selectedProjectFolder = normalizeFolder(request.selectedProjectFolder);
  const availableClis = getAvailableClis(request.cliDetections);
  const intent = classifyAgentMondayIntent(task);
  const explicitCliCounts = parseExplicitCliCounts(task);

  if (!request.prompt.trim()) {
    return {
      status: 'blocked',
      intent,
      task,
      selectedProjectFolder,
      availableClis,
      routes: [],
      writerCli: null,
      blockedReason: 'Enter a task for Agent Monday before launching agents.',
    };
  }

  if (availableClis.length === 0) {
    return {
      status: 'blocked',
      intent,
      task,
      selectedProjectFolder,
      availableClis,
      routes: [],
      writerCli: null,
      blockedReason: 'No supported assistant CLIs are installed or available.',
    };
  }

  if (explicitCliCounts) {
    const routes = buildExplicitCliRoutes({
      counts: explicitCliCounts,
      availableClis,
      selectedProjectFolder,
      task,
      intent,
    });
    const writerCli = routes.find((route) => route.canWrite)?.cli ?? null;
    return {
      status: routes.length > 0 ? 'ready' : 'blocked',
      intent,
      task,
      selectedProjectFolder,
      availableClis,
      routes,
      writerCli,
      blockedReason: routes.length > 0 ? undefined : 'None of the requested CLIs are installed or available.',
    };
  }

  const selections = getRoleSelections(intent);
  const targetRouteCount = decideRouteCount(task, intent, selections);
  const routes: AgentMondayRoute[] = [];
  let writerCli: CliKind | null = null;

  for (const selection of selections.slice(0, targetRouteCount)) {
    const cli = pickInstalledCli(selection.preferredCli, availableClis, routes);
    if (!cli) continue;

    const canWrite = selection.canWrite && writerCli === null;
    if (canWrite) writerCli = cli;

    routes.push({
      cli,
      role: selection.role,
      intent,
      canWrite,
      reason:
        cli === selection.preferredCli
          ? selection.reason
          : `${selection.reason} Fallback selected because ${selection.preferredCli} is not available.`,
      supervisedPrompt: buildAgentMondaySupervisedPrompt({
        cli,
        role: selection.role,
        canWrite,
        selectedProjectFolder,
        task,
        requestedInstance: undefined,
      }),
    });
  }

  return {
    status: routes.length > 0 ? 'ready' : 'blocked',
    intent,
    task,
    selectedProjectFolder,
    availableClis,
    routes,
    writerCli,
    blockedReason: routes.length > 0 ? undefined : 'No installed CLI could be assigned to this task.',
  };
}

export function classifyAgentMondayIntent(prompt: string): AgentMondayIntent {
  const text = prompt.toLowerCase();
  const hasStrongImplementationIntent = hasAnyTerm(text, STRONG_IMPLEMENTATION_TERMS);

  if (hasAnyTerm(text, ['architecture', 'design plan', 'system design'])) return 'architecture';
  if (hasAnyTerm(text, ['risk', 'threat', 'security audit'])) return 'risk';
  if (!hasStrongImplementationIntent && hasAnyTerm(text, ['review', 'audit', 'inspect'])) return 'review';
  if (hasAnyTerm(text, ['large context', 'large-context', 'whole repo', 'entire repo'])) return 'large-context';
  if (hasAnyTerm(text, ['docs', 'documentation', 'readme'])) return 'docs';
  if (hasAnyTerm(text, ['explore', 'research', 'find', 'search', 'summarize'])) return 'exploration';
  if (hasAnyTerm(text, ['refactor', 'rename', 'restructure'])) return 'refactor';
  if (hasAnyTerm(text, ['bug', 'fix', 'broken', 'regression', 'crash'])) return 'bugfix';
  if (hasAnyTerm(text, IMPLEMENTATION_TERMS)) return 'implementation';
  if (hasAnyTerm(text, ['test', 'spec', 'coverage'])) return 'test';
  if (hasAnyTerm(text, REVIEW_TERMS)) return 'review';
  if (hasAnyTerm(text, EXPLORATION_TERMS)) return 'exploration';

  return 'general';
}

export function buildAgentMondaySupervisedPrompt(input: {
  cli: CliKind;
  role: AgentMondayRole;
  canWrite: boolean;
  selectedProjectFolder: string | null;
  task: string;
  requestedInstance?: number;
}): string {
  const folder = input.selectedProjectFolder ?? 'No project folder selected';
  const writeRule = input.canWrite
    ? 'You are the only writer for this Agent Monday run. Keep edits focused, do not commit, and do not touch unrelated files.'
    : 'You are not the writer for this Agent Monday run. Do not edit files; provide analysis, plans, findings, or commands only.';
  const roleRule = roleInstruction(input.role);

  return [
    'Agent Monday supervised route',
    `Assistant: ${input.cli}`,
    `Role: ${input.role}`,
    input.requestedInstance ? `Agent instance: ${input.requestedInstance}` : null,
    `Folder: ${folder}`,
    `Task: ${input.task}`,
    `Role instruction: ${roleRule}`,
    `Single-writer constraint: ${writeRule}`,
    'V1 constraints: use the local CLI session only, do not ask for app-level API keys, do not call direct model APIs, and keep all approvals visible in this terminal.',
    'When finished, summarize what you did, what remains, and any commands the user should run.',
  ].filter((line): line is string => typeof line === 'string').join('\n');
}

function getRoleSelections(intent: AgentMondayIntent): RoleSelection[] {
  if (intent === 'review' || intent === 'architecture' || intent === 'risk') {
    return [
      {
        role: 'reviewer',
        preferredCli: 'claude',
        canWrite: false,
        reason: 'Claude is the default reviewer and planner for review, architecture, and risk tasks.',
      },
      {
        role: 'explainer',
        preferredCli: 'gemini',
        canWrite: false,
        reason: 'Gemini can support review work by exploring broad repo context without editing.',
      },
    ];
  }

  if (intent === 'docs' || intent === 'large-context' || intent === 'exploration') {
    return [
      {
        role: 'explainer',
        preferredCli: 'gemini',
        canWrite: false,
        reason: 'Gemini is the default explorer for docs, discovery, and large-context tasks.',
      },
      {
        role: 'reviewer',
        preferredCli: 'claude',
        canWrite: false,
        reason: 'Claude can turn exploration into a concise implementation or risk plan.',
      },
    ];
  }

  if (intent === 'general') {
    return [
      {
        role: 'reviewer',
        preferredCli: 'claude',
        canWrite: false,
        reason: 'Claude is the default planner when Agent Monday needs to clarify an ambiguous task.',
      },
      {
        role: 'explainer',
        preferredCli: 'gemini',
        canWrite: false,
        reason: 'Gemini can inspect broad context before a writing agent is selected.',
      },
    ];
  }

  return [
    {
      role: 'writer',
      preferredCli: 'codex',
      canWrite: true,
      reason: 'Codex is the default writer for implementation, refactor, bug, and test tasks.',
    },
    {
      role: 'reviewer',
      preferredCli: 'claude',
      canWrite: false,
      reason: 'Claude reviews the proposed or completed implementation without editing.',
    },
    {
      role: 'tester',
      preferredCli: 'gemini',
      canWrite: false,
      reason: 'Gemini checks test strategy and broad context without editing.',
    },
  ];
}

function decideRouteCount(
  task: string,
  intent: AgentMondayIntent,
  selections: readonly RoleSelection[],
): number {
  const explicit = parseExplicitAgentCount(task);
  if (explicit !== null) return clampAgentCount(explicit, selections.length);

  const implied = inferRoleRequestedCount(task, selections);
  if (implied !== null) return clampAgentCount(implied, selections.length);

  void intent;
  return 1;
}

export function parseExplicitCliCounts(prompt: string): Partial<Record<CliKind, number>> | null {
  const text = prompt.toLowerCase();
  if (!/\b(?:agent|agents|pane|panes|panel|panels|terminal|terminals|cli|clis|codex|claude|gemini)\b/.test(text)) {
    return null;
  }

  const counts: Partial<Record<CliKind, number>> = {};
  const aliases: Record<CliKind, readonly string[]> = {
    codex: ['codex'],
    claude: ['claude code', 'claude-code', 'claude'],
    gemini: ['gemini'],
  };

  for (const kind of CLI_ORDER) {
    let found: number | null = null;
    for (const alias of aliases[kind]) {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const before = new RegExp(
        `\\b(\\d+|${Object.keys(AGENT_COUNT_WORDS).join('|')})\\s+(?:${kind === 'claude' ? 'claude\\s+code|claude-code|claude' : escapedAlias})(?:\\s+(?:agents?|panes?|panels?|terminals?|clis?))?\\b`,
      );
      const beforeWithNoun = new RegExp(
        `\\b(\\d+|${Object.keys(AGENT_COUNT_WORDS).join('|')})\\s+(?:agents?|panes?|panels?|terminals?|clis?)\\s+(?:of|for|from)?\\s*(?:${escapedAlias})\\b`,
      );
      const after = new RegExp(
        `\\b(?:${escapedAlias})\\s*(?:agents?|panes?|panels?|terminals?|clis?)?\\s*(?:x|:|=)?\\s*(\\d+|${Object.keys(AGENT_COUNT_WORDS).join('|')})\\b`,
      );
      const match = text.match(before) ?? text.match(beforeWithNoun) ?? text.match(after);
      if (match?.[1]) {
        found = parseAgentCountToken(match[1]);
        break;
      }
    }
    if (found !== null) counts[kind] = found;
  }

  const hasExplicitCounts = Object.values(counts).some((count) => typeof count === 'number' && count > 0);
  return hasExplicitCounts ? counts : null;
}

function buildExplicitCliRoutes(input: {
  counts: Partial<Record<CliKind, number>>;
  availableClis: readonly CliKind[];
  selectedProjectFolder: string | null;
  task: string;
  intent: AgentMondayIntent;
}): AgentMondayRoute[] {
  const routes: AgentMondayRoute[] = [];
  let writerAssigned = false;

  for (const kind of CLI_ORDER) {
    const requested = input.counts[kind] ?? 0;
    if (requested <= 0 || !input.availableClis.includes(kind)) continue;
    for (let index = 1; index <= requested && routes.length < MAX_AGENT_ROUTES; index++) {
      const role = explicitRoleForCli(kind, index, writerAssigned);
      const canWrite = role === 'writer' && !writerAssigned;
      if (canWrite) writerAssigned = true;
      const reason = `User explicitly requested ${requested} ${cliLabel(kind)} agent${requested === 1 ? '' : 's'}.`;
      routes.push({
        cli: kind,
        role,
        intent: input.intent,
        canWrite,
        reason,
        requestedInstance: index,
        supervisedPrompt: buildAgentMondaySupervisedPrompt({
          cli: kind,
          role,
          canWrite,
          selectedProjectFolder: input.selectedProjectFolder,
          task: input.task,
          requestedInstance: index,
        }),
      });
    }
  }

  return routes;
}

function explicitRoleForCli(kind: CliKind, instance: number, writerAssigned: boolean): AssistantAgentRole {
  if (kind === 'codex' && instance === 1 && !writerAssigned) return 'writer';
  if (instance % 3 === 0) return 'tester';
  if (kind === 'gemini') return 'explainer';
  return 'reviewer';
}

export function parseExplicitAgentCount(prompt: string): number | null {
  const text = prompt.toLowerCase();
  if (/\ball\s+(?:three|3)\s+(?:agents?|panes?|panels?|terminals?|clis?)\b/.test(text)) return 3;
  if (/\b(?:all|every)\s+(?:agents?|panes?|panels?|terminals?|clis?)\b/.test(text)) return 3;

  const numeric = text.match(
    /\b(?:use|open|launch|start|run|with|spin\s+up)\s+(\d+)\s+(?:agents?|panes?|panels?|terminals?|clis?)\b/,
  );
  if (numeric?.[1]) return Number.parseInt(numeric[1], 10);

  const reversedNumeric = text.match(
    /\b(\d+)\s+(?:agents?|panes?|panels?|terminals?|clis?)\b/,
  );
  if (reversedNumeric?.[1]) return Number.parseInt(reversedNumeric[1], 10);

  for (const [word, count] of Object.entries(AGENT_COUNT_WORDS)) {
    const pattern = new RegExp(
      `\\b(?:use|open|launch|start|run|with|spin\\s+up)?\\s*${word}\\s+(?:agents?|panes?|panels?|terminals?|clis?)\\b`,
    );
    if (pattern.test(text)) return count;
  }

  return null;
}

function parseAgentCountToken(token: string): number | null {
  if (/^\d+$/.test(token)) return Number.parseInt(token, 10);
  return AGENT_COUNT_WORDS[token] ?? null;
}

function inferRoleRequestedCount(
  task: string,
  selections: readonly RoleSelection[],
): number | null {
  const text = task.toLowerCase();
  if (!/\b(?:agent|agents|reviewer|tester|explainer|second|another|separate)\b/.test(text)) return null;

  const requestedRoles = new Set<AssistantAgentRole>();
  if (/\bwriter\b|\bwriting agent\b|\bimplement(?:er|ation)? agent\b/.test(text)) requestedRoles.add('writer');
  if (/\breviewer\b|\breview agent\b|\bsecond agent\b|\banother agent\b|\bseparate review\b/.test(text)) {
    requestedRoles.add('reviewer');
  }
  if (/\btester\b|\btest agent\b|\bseparate test\b/.test(text)) requestedRoles.add('tester');
  if (/\bexplainer\b|\bexploration agent\b|\bexplorer\b|\bsummarizer\b/.test(text)) requestedRoles.add('explainer');

  if (requestedRoles.size === 0) return null;

  let highestIndex = -1;
  for (const [index, selection] of selections.entries()) {
    if (requestedRoles.has(selection.role)) highestIndex = Math.max(highestIndex, index);
  }
  return highestIndex >= 0 ? highestIndex + 1 : null;
}

function clampAgentCount(count: number, max: number): number {
  if (!Number.isFinite(count)) return 1;
  return Math.max(1, Math.min(max, Math.round(count)));
}

function getAvailableClis(cliDetections: readonly CliDetectionResult[]): CliKind[] {
  const available = new Set<CliKind>();

  for (const detection of cliDetections) {
    if (detection.status === 'available') available.add(detection.kind);
  }

  return CLI_ORDER.filter((kind) => available.has(kind));
}

function pickInstalledCli(
  preferredCli: CliKind,
  availableClis: readonly CliKind[],
  existingRoutes: readonly AgentMondayRoute[],
): CliKind | null {
  const used = new Set(existingRoutes.map((route) => route.cli));
  if (availableClis.includes(preferredCli) && !used.has(preferredCli)) return preferredCli;

  return availableClis.find((kind) => !used.has(kind)) ?? null;
}

function normalizeTask(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : 'No task prompt provided';
}

function normalizeFolder(selectedProjectFolder: string | null): string | null {
  const folder = selectedProjectFolder?.trim();
  return folder ? folder : null;
}

function hasAnyTerm(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function roleInstruction(role: AssistantAgentRole): string {
  if (role === 'writer') return 'Implement the requested change as the single editing agent.';
  if (role === 'reviewer') return 'Review architecture, risks, correctness, and regression potential without editing.';
  if (role === 'tester') return 'Check test strategy and suggest or run verification commands without editing.';
  return 'Explore, summarize, and explain broad project context without editing.';
}

function cliLabel(kind: CliKind): string {
  if (kind === 'claude') return 'Claude Code';
  if (kind === 'gemini') return 'Gemini';
  return 'Codex';
}
