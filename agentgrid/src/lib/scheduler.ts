// NOTE: node-cron requires a persistent Node.js process.
// Works for local dev and self-hosted. NOT suitable for serverless deployments (Vercel).
import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '@/lib/prisma';

const jobs = new Map<string, ScheduledTask>();

export async function startScheduler(): Promise<void> {
  try {
    const agents = await prisma.scheduledAgent.findMany({ where: { enabled: true } });
    for (const agent of agents) {
      scheduleAgent(agent.id, agent.cronExpression, agent.llmConfigJson);
    }
    console.log(`[Scheduler] Started ${agents.length} scheduled agent(s)`);
  } catch (err) {
    console.error('[Scheduler] Failed to start:', err);
  }
}

export function scheduleAgent(id: string, expression: string, llmConfigJson: string | null): void {
  stopAgent(id);
  if (!cron.validate(expression)) {
    console.warn(`[Scheduler] Invalid cron expression for agent ${id}: ${expression}`);
    return;
  }
  const task = cron.schedule(expression, () => {
    triggerAgent(id).catch((err) => console.error(`[Scheduler] Agent ${id} error:`, err));
  });
  jobs.set(id, task);
}

export function stopAgent(id: string): void {
  const existing = jobs.get(id);
  if (existing) {
    existing.stop();
    jobs.delete(id);
  }
}

async function triggerAgent(id: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  await fetch(`${baseUrl}/api/scheduled-agents/${id}/run`, { method: 'POST' });
}
