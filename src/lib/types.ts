export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting_approval'
  | 'error';

export type ToolName =
  | 'create_file'
  | 'read_dir'
  | 'read_file'
  | 'search'
  | 'edit_file'
  | 'send_message';

export type ActionStatus = 'pending' | 'approved' | 'denied' | 'completed';

export interface ToolAction {
  id: string;
  agentId: string;
  tool: ToolName;
  params: Record<string, unknown>;
  status: ActionStatus;
  result?: string;
  timestamp: number;
}

export type LogType = 'thought' | 'action' | 'result' | 'error' | 'system' | 'message';

export interface LogEntry {
  type: LogType;
  content: string;
  timestamp: number;
}

export interface LLMResponse {
  thought: string;
  action?: {
    tool: ToolName;
    params: Record<string, unknown>;
  };
}

export type MessageType = 'request' | 'response' | 'delegation' | 'notification';

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string;
  toAgentName: string;
  type: MessageType;
  content: string;
  timestamp: number;
  status: 'pending' | 'delivered' | 'read';
}

export interface TreeItem {
  name: string;
  type: 'file' | 'dir';
  path: string;
  children?: TreeItem[];
  size?: number;
}

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface Session {
  id: string;
  name: string;
  agents: Agent[];
  messages: AgentMessage[];
  startTime: number;
  endTime: number | null;
  status: SessionStatus;
  estimatedTokens: number;
  estimatedCost: number;
}

export interface RateLimitInfo {
  tokensLimit: number;
  tokensRemaining: number;
  requestsLimit: number;
  requestsRemaining: number;
  tokensResetAt: number | null;    // absolute ms timestamp
  requestsResetAt: number | null;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  pendingAction: ToolAction | null;
  log: LogEntry[];
  apiKeyId?: string;
  rateLimit?: RateLimitInfo;
}
