import type {
  AgentGridAppStateApi,
  AgentGridBrowserApi,
  AgentGridCliApi,
  AgentGridFolderApi,
  AgentGridPtyApi,
} from '../preload/preload';

declare global {
  interface Window {
    agentgridPty: AgentGridPtyApi;
    agentgridCli?: AgentGridCliApi;
    agentgridFolders?: AgentGridFolderApi;
    agentgridAppState?: AgentGridAppStateApi;
    agentgridBrowser?: AgentGridBrowserApi;
  }
}
export {};
