# AgentGrid

A visual multi-agent AI orchestration platform. Spawn multiple AI agents, watch them think in real time, approve or deny tool use, and let them collaborate on file-based tasks.

## Features

- **Multi-agent control** — Run agents in parallel, each with their own task and log
- **Human-in-the-loop approvals** — Review every tool call before it executes
- **Workspace file tools** — Agents can create, read, edit, and search files in a sandboxed `workspace/` directory
- **Agent-to-agent messaging** — Agents can delegate tasks to each other
- **Session history & cost tracking** — Token counts and estimated costs per session (model-aware pricing)
- **Multi-provider LLM support** — Works with OpenAI or any OpenAI-compatible provider (e.g. OpenRouter)
- **Google OAuth + credentials auth** — Sign in with Google or register a local account

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file:

```env
# NextAuth
AUTH_SECRET=your-secret-here   # generate with: openssl rand -base64 32

# Google OAuth (optional — credentials login works without it)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Sign in (Google OAuth or register a local account at `/register`)
2. Go to the Dashboard and click **+** in the sidebar to spawn an agent
3. Enter a task and hit **Run**
4. When an agent requests a tool, the approval drawer opens — review and approve or deny
5. Watch results stream in real time in the agent log

## LLM Configuration

Click the settings icon in the sidebar to set your API key, provider base URL, and model. Keys are stored in `localStorage` only — never sent to the server.

## File Workspace

Agent file operations are sandboxed to the `workspace/` directory at the project root. Files are visible in the Workspace panel on the right side of the dashboard. File size is capped at 1 MB for both reads and writes.

## User Accounts

Local accounts are stored in `data/users.json` (created automatically). Passwords are hashed with bcrypt. Register at `/register`, sign in at `/login`.
