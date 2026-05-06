import { describe, expect, it } from 'vitest';

import {
  buildAgentMondayRoutePlan,
  buildAgentMondaySupervisedPrompt,
  classifyAgentMondayIntent,
  parseExplicitAgentCount,
  parseExplicitCliCounts,
} from './assistant';
import type { CliDetectionResult, CliKind } from './cli';

function detection(kind: CliKind, status: CliDetectionResult['status']): CliDetectionResult {
  return {
    kind,
    status,
    checkedAt: 1,
  };
}

const allAvailable = [
  detection('codex', 'available'),
  detection('claude', 'available'),
  detection('gemini', 'available'),
];

describe('Agent Monday routing', () => {
  it('chooses one writer for implementation tasks, preferring Codex', () => {
    const plan = buildAgentMondayRoutePlan('Implement the assistant panel and tests', 'C:\\repo', allAvailable);

    expect(plan.status).toBe('ready');
    expect(plan.intent).toBe('implementation');
    expect(plan.writerCli).toBe('codex');
    expect(plan.routes).toHaveLength(1);
    expect(plan.routes.filter((route) => route.canWrite)).toHaveLength(1);
    expect(plan.routes[0]).toMatchObject({ role: 'writer', cli: 'codex', canWrite: true });
  });

  it('routes review, architecture, and risk tasks to Claude without write access', () => {
    const reviewPlan = buildAgentMondayRoutePlan('Review this code for regressions', 'C:\\repo', allAvailable);
    const architecturePlan = buildAgentMondayRoutePlan('Create an architecture plan', 'C:\\repo', allAvailable);
    const riskPlan = buildAgentMondayRoutePlan('Assess security risk in auth', 'C:\\repo', allAvailable);

    expect(reviewPlan).toMatchObject({ status: 'ready', intent: 'review', writerCli: null });
    expect(reviewPlan.routes).toHaveLength(1);
    expect(architecturePlan.routes).toHaveLength(1);
    expect(riskPlan.routes).toHaveLength(1);
    expect(reviewPlan.routes[0]).toMatchObject({ cli: 'claude', role: 'reviewer', canWrite: false });
    expect(architecturePlan.routes[0]).toMatchObject({ cli: 'claude', role: 'reviewer', canWrite: false });
    expect(riskPlan.routes[0]).toMatchObject({ cli: 'claude', role: 'reviewer', canWrite: false });
  });

  it('routes large-context and docs work to Gemini first', () => {
    const plan = buildAgentMondayRoutePlan('Summarize the whole repo documentation structure', 'C:\\repo', allAvailable);

    expect(plan.status).toBe('ready');
    expect(plan.intent).toBe('large-context');
    expect(plan.routes).toHaveLength(1);
    expect(plan.routes[0]).toMatchObject({ cli: 'gemini', role: 'explainer', canWrite: false });
  });

  it('keeps simple hello world tasks to one agent', () => {
    const plan = buildAgentMondayRoutePlan('Make a hello world page', 'C:\\repo', allAvailable);

    expect(plan.status).toBe('ready');
    expect(plan.routes).toHaveLength(1);
    expect(plan.routes[0]).toMatchObject({ cli: 'codex', role: 'writer', canWrite: true });
  });

  it('honors explicit agent counts when requested', () => {
    const twoAgentPlan = buildAgentMondayRoutePlan('Use 2 agents to implement this and review it', 'C:\\repo', allAvailable);
    const threeAgentPlan = buildAgentMondayRoutePlan('Open all three agents for this implementation', 'C:\\repo', allAvailable);

    expect(twoAgentPlan.routes).toHaveLength(2);
    expect(twoAgentPlan.routes.map((route) => route.role)).toEqual(['writer', 'reviewer']);
    expect(threeAgentPlan.routes).toHaveLength(3);
    expect(threeAgentPlan.routes.map((route) => route.role)).toEqual(['writer', 'reviewer', 'tester']);
  });

  it('opens duplicate CLI panes when the user asks for specific CLI counts', () => {
    const plan = buildAgentMondayRoutePlan('Open 3 agents of Codex and 3 agents of Claude Code', 'C:\\repo', allAvailable);

    expect(plan.status).toBe('ready');
    expect(plan.routes).toHaveLength(6);
    expect(plan.routes.map((route) => route.cli)).toEqual([
      'codex',
      'codex',
      'codex',
      'claude',
      'claude',
      'claude',
    ]);
    expect(plan.routes.filter((route) => route.canWrite)).toHaveLength(1);
    expect(plan.routes.map((route) => route.requestedInstance)).toEqual([1, 2, 3, 1, 2, 3]);
  });

  it('skips specifically requested CLIs that are not installed', () => {
    const plan = buildAgentMondayRoutePlan('Open 2 Codex agents and 2 Gemini agents', 'C:\\repo', [
      detection('codex', 'available'),
      detection('claude', 'available'),
      detection('gemini', 'missing'),
    ]);

    expect(plan.status).toBe('ready');
    expect(plan.routes).toHaveLength(2);
    expect(plan.routes.map((route) => route.cli)).toEqual(['codex', 'codex']);
  });

  it('does not treat unrelated numbers as agent counts', () => {
    const plan = buildAgentMondayRoutePlan('Create 2 files for a hello world example', 'C:\\repo', allAvailable);

    expect(plan.routes).toHaveLength(1);
  });

  it('falls back only to installed CLIs when the preferred writer is unavailable', () => {
    const plan = buildAgentMondayRoutePlan('Fix the failing renderer build', 'C:\\repo', [
      detection('codex', 'missing'),
      detection('claude', 'available'),
      detection('gemini', 'missing'),
    ]);

    expect(plan.status).toBe('ready');
    expect(plan.availableClis).toEqual(['claude']);
    expect(plan.writerCli).toBe('claude');
    expect(plan.routes.filter((route) => route.canWrite)).toHaveLength(1);
    expect(plan.routes[0]).toMatchObject({ cli: 'claude', role: 'writer', canWrite: true });
    expect(plan.routes[0]?.reason).toContain('Fallback selected');
  });

  it('returns a blocked plan when no assistant CLIs are available', () => {
    const plan = buildAgentMondayRoutePlan('Implement a feature', 'C:\\repo', [
      detection('codex', 'missing'),
      detection('claude', 'missing'),
      detection('gemini', 'invocation_failed'),
    ]);

    expect(plan.status).toBe('blocked');
    expect(plan.writerCli).toBeNull();
    expect(plan.routes).toEqual([]);
    expect(plan.blockedReason).toContain('No supported assistant CLIs');
  });

  it('blocks empty tasks before launch', () => {
    const plan = buildAgentMondayRoutePlan('   ', 'C:\\repo', allAvailable);

    expect(plan.status).toBe('blocked');
    expect(plan.blockedReason).toContain('Enter a task');
  });
});

describe('Agent Monday explicit count parsing', () => {
  it('parses numeric and worded agent count requests', () => {
    expect(parseExplicitAgentCount('open 2 agents')).toBe(2);
    expect(parseExplicitAgentCount('use three panels')).toBe(3);
    expect(parseExplicitAgentCount('open all three agents')).toBe(3);
    expect(parseExplicitAgentCount('create 2 files')).toBeNull();
  });

  it('parses explicit per-CLI counts', () => {
    expect(parseExplicitCliCounts('open 3 agents of codex and 3 agents of claude code')).toEqual({
      codex: 3,
      claude: 3,
    });
    expect(parseExplicitCliCounts('codex x2, gemini x1')).toEqual({
      codex: 2,
      gemini: 1,
    });
    expect(parseExplicitCliCounts('make 3 files')).toBeNull();
  });
});

describe('Agent Monday supervised prompts', () => {
  it('includes Agent Monday context and single-writer constraints', () => {
    const prompt = buildAgentMondaySupervisedPrompt({
      cli: 'codex',
      role: 'writer',
      canWrite: true,
      selectedProjectFolder: 'C:\\repo',
      task: 'Implement tests',
    });

    expect(prompt).toContain('Agent Monday');
    expect(prompt).toContain('Role: writer');
    expect(prompt).toContain('Folder: C:\\repo');
    expect(prompt).toContain('Task: Implement tests');
    expect(prompt).toContain('Single-writer constraint:');
    expect(prompt).toContain('only writer');
  });
});

describe('Agent Monday intent classification', () => {
  it('recognizes architecture before implementation words', () => {
    expect(classifyAgentMondayIntent('Create an architecture plan for the renderer')).toBe('architecture');
  });
});
