import { prisma } from '@/lib/prisma';

export interface AuditPayload {
  agentId: string;
  agentName: string;
  tool: string;
  action: 'approved' | 'denied' | 'error';
  params: Record<string, unknown>;
  result?: string;
  userId: string;
}

export async function logAudit(entry: AuditPayload): Promise<void> {
  await prisma.auditLog.create({
    data: {
      agentId: entry.agentId,
      agentName: entry.agentName,
      tool: entry.tool,
      action: entry.action,
      paramsJson: JSON.stringify(entry.params),
      result: entry.result,
      userId: entry.userId,
    },
  });
}
