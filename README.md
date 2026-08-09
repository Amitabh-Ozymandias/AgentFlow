# ⚙️ AgentFlow — AI Agent Workflow Builder

A purpose-built mini n8n for chaining AI agent steps, enforcing multi-tenant organization boundaries, handling human-in-the-loop approval gates, and streaming live execution progress.

![AgentFlow Architecture](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)
![Nhost](https://img.shields.io/badge/Nhost-Backend-blue?style=for-the-badge&logo=nhost)
![Hasura](https://img.shields.io/badge/Hasura-GraphQL-purple?style=for-the-badge&logo=hasura)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)

---

## 🌟 Key Features

- **🧠 Multi-Provider LLM Node**: Connects to **Google Gemini** (`gemini-2.0-flash`), **Groq** (`llama-3.1-70b`), or **OpenRouter** APIs for live AI sentiment analysis, summarization, and task execution.
- **🔒 Dual-Layer Security Model**:
  - **Layer 1 (Org + Role Scoping)**: Row-level security preventing users from cross-accessing data in other organizations (`Owner`, `Editor`, `Viewer`).
  - **Layer 2 (Step Action Gating)**: Action-handler level authorization checking step types (e.g. only `Owner`/`Editor` can approve gates or configure DB writes/webhooks).
- **⏸ Human-in-the-Loop (HITL) Approval Gates**: Execution engine pauses mid-pipeline on `approval_gate` steps until an authorized approver reviews the payload and approves continuation.
- **🔀 Conditional Branching**: Evaluates outputs from previous steps (`==`, `!=`, `contains`) to dynamically skip downstream nodes.
- **⚡ 4 Trigger Modes**: Manual button click, Webhook endpoint (`/api/webhook/[token]`), Scheduled Cron (`0 9 * * *`), and Database Event triggers.
- **📊 Real-time Execution Monitoring**: Step-by-step timeline streaming progress, durations, status badges, and expandable JSON input/output inspectors.
- **💳 Quota Management**: Real-time quota enforcement (e.g. `37/100` calls used per period) with automatic incrementing upon workflow completion.

---

## 📐 Data Model & PostgreSQL Schema

The data model enforces strict relational hierarchies (`Organization` ➔ `OrgMembers` / `Workflows` ➔ `Steps` & `Triggers` ➔ `Runs` ➔ `StepRuns`):

```
┌─────────────────┐       ┌─────────────────┐
│  organizations  │───┬───│   org_members   │
└─────────────────┘   │   └─────────────────┘
         │            │
         ▼            │
┌─────────────────┐   │   ┌─────────────────┐
│    workflows    │◄──┘   │      users      │
└─────────────────┘       └─────────────────┘
   │           │
   ├───────────┼────────────────┐
   ▼           ▼                ▼
┌───────┐ ┌──────────┐ ┌─────────────────┐
│ steps │ │ triggers │ │  workflow_runs  │
└───────┘ └──────────┘ └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │    step_runs    │
                       └─────────────────┘
```

### Table Breakdown

| Table | Key Fields | Description |
| :--- | :--- | :--- |
| `organizations` | `id`, `name`, `quota_allowed`, `quota_used` | Multi-tenant organization boundaries and quota tracking |
| `org_members` | `id`, `org_id`, `user_id`, `role` | Maps users to orgs with roles (`owner`, `editor`, `viewer`) |
| `workflows` | `id`, `org_id`, `name`, `description`, `created_by` | Workflow pipeline definitions |
| `workflow_steps` | `id`, `workflow_id`, `position`, `type`, `config` | Ordered pipeline steps (`llm_call`, `http_request`, etc.) |
| `workflow_triggers` | `id`, `workflow_id`, `type`, `config`, `enabled` | Triggers (`manual`, `webhook`, `scheduled`, `database_event`) |
| `workflow_runs` | `id`, `workflow_id`, `triggered_by`, `status` | Run execution instance (`running`, `paused`, `completed`, `failed`) |
| `step_runs` | `id`, `workflow_run_id`, `status`, `input`, `output`, `approved_by` | Per-step execution state and approval log |

---

## 🛠️ Step Types & Trigger Engine

### 1. Supported Step Types (Nodes)
- **🧠 LLM Call (`llm_call`)**: Executes prompts against Gemini, Groq, or OpenRouter APIs via `/api/llm`.
- **🌐 HTTP Request (`http_request`)**: Fetches data from external REST APIs with custom headers and HTTP methods.
- **🔀 Conditional Branch (`conditional_branch`)**: Compares previous output keys; skips downstream steps if condition evaluates to false.
- **🔒 Approval Gate (`approval_gate`)**: Pauses run execution (`status = 'paused'`) until an `Owner` or `Editor` approves.
- **💾 DB Write (`db_write`)**: Writes structured payload JSON to internal PostgreSQL database tables.
- **🔔 Notify (`notify`)**: Sends notifications across system logs, email, or webhook channels.

### 2. Supported Trigger Types
- **👆 Manual**: Triggered on-demand via the UI with custom JSON inputs.
- **🌐 Webhook Endpoint**: Triggered externally via `POST /api/webhook/[token]`.
- **⏰ Scheduled (Cron)**: Fired automatically on cron schedules.
- **⚡ Database Event**: Fired via Hasura Event Triggers when watched database rows mutate.

---

## 🔐 Dual-Layer Security & RBAC Enforcement

### Layer 1: Multi-Tenant Scoping (Database & Row-Level Security)
Every GraphQL query, mutation, and subscription checks `x-hasura-user-id` and `x-hasura-org-id`. A user in **Org A (Acme Corp)** can *never* query or mutate data belonging to **Org B (Globex Inc)**, even if they guess UUIDs directly.

### Layer 2: Step-Level Action Authorization (Action Handler Enforcement)
Executed inside Hasura Action handlers (`triggerWorkflowRun` & `approveStep`):
- **Approval Gate Resolution**: The `approveStep` handler verifies that `req.user.role` is `owner` or `editor` within the specific workflow's organization before changing `step_run` status from `paused` to `completed`. `Viewer` roles receive a `403 Forbidden` error.
- **Privileged Node Protection**: Creating or modifying `db_write`, `webhook`, or `notify` steps requires `owner` or `editor` privileges.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** / **pnpm** / **yarn**

### Quickstart (Frontend Development Server)

```bash
# 1. Clone the repository
git clone https://github.com/your-username/AI-Agent-Workflow-Builder.git
cd AI-Agent-Workflow-Builder/frontend

# 2. Install dependencies
npm install

# 3. Start the Next.js development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Configuring API Keys

You can configure your LLM API Key (Google Gemini, Groq, or OpenRouter) in two ways:

### Method A: Directly in the UI (Recommended)
1. Open **[http://localhost:3000](http://localhost:3000)**.
2. In the left sidebar, click **🔑 API Keys**.
3. Select your provider (**Google Gemini**, **Groq**, or **OpenRouter**).
4. Paste your API key and click **Save API Key**. The sidebar badge will turn green **`Active`**.

### Method B: Environment Variables
Create a `.env.local` file inside the `frontend/` directory:

```env
LLM_PROVIDER=gemini

# Provider Keys
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
```

---

## 🧪 Testing the End-to-End Scenario

Follow these steps to demonstrate all assignment requirements:

1. **Sign In as Alice (Owner)**: Select `Alice (Owner)` on the login screen.
2. **Inspect Pre-loaded Workflows & Paused Run**:
   - Go to **Runs** ➔ click **`run-paused-demo-8812`**.
   - Notice **Step 1 (LLM Call)** and **Step 2 (Conditional Branch)** are completed, while **Step 3 (Approval Gate)** is **`paused` ⏸**.
3. **Approve Step Live**:
   - Click **`✓ Approve & Continue`**.
   - Watch the remaining steps (**Save CRM Ticket Record** and **Alert Support Team**) execute live to completion!
4. **Test Viewer Permissions (Read-Only)**:
   - Sign Out ➔ Log in as **Carol (Viewer)**.
   - Verify that **`▶ Run Workflow`**, step edit actions, and **`Approve`** buttons are hidden.
5. **Test Multi-Tenant Isolation**:
   - Sign Out ➔ Log in as **Dave (Org B Owner)**.
   - Verify that Org B's workspace is completely isolated and cannot access Org A's data.

---

## 📁 Repository Structure

```
AI-Agent-Workflow-Builder/
├── frontend/                     # Next.js 16 App Router application
│   ├── app/                      # App routes (dashboard, workflows, runs, api)
│   ├── components/               # UI components (AppShell, WorkflowEditor, RunStatus, etc.)
│   ├── lib/                      # Store state management & execution engine
│   └── public/                   # Static assets
├── functions/                    # Nhost serverless functions
│   ├── lib/                      # LLM service wrappers & permission checkers
│   ├── approve-step.ts           # Hasura Action handler for approving gates
│   └── trigger-workflow-run.ts   # Hasura Action handler for workflow initiation
├── nhost/                        # Nhost & Hasura configuration
│   └── migrations/               # PostgreSQL schema migrations
└── seed/                         # SQL seed files for demo data
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
