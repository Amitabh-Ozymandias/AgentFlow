// ============================================================
// Store — Local state management simulating Nhost backend
// This acts as the single source of truth for the entire app.
// When Nhost is connected, replace these with GraphQL operations.
// ============================================================

'use client';

import React, { createContext, useContext, useReducer, useCallback, useRef, type ReactNode } from 'react';

// ---- Types matching the PostgreSQL schema ----

export type OrgRole = 'owner' | 'editor' | 'viewer';
export type StepType = 'llm_call' | 'http_request' | 'db_write' | 'notify' | 'conditional_branch' | 'approval_gate';
export type TriggerType = 'manual' | 'webhook' | 'scheduled' | 'database_event';
export type RunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
export type StepRunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'skipped';

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Organization {
  id: string;
  name: string;
  quota_allowed: number;
  quota_used: number;
  quota_period: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  user?: User;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  position: number;
  type: StepType;
  name: string;
  config: Record<string, unknown>;
}

export interface WorkflowTrigger {
  id: string;
  workflow_id: string;
  type: TriggerType;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
}

export interface StepRun {
  id: string;
  workflow_run_id: string;
  workflow_step_id: string;
  position: number;
  step_type: StepType;
  step_name: string;
  status: StepRunStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: string | null;
  attempt_count: number;
  approved_by: string | null;
  approved_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  triggered_by: string;
  trigger_type: TriggerType;
  status: RunStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  step_runs: StepRun[];
}

export interface AppState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;

  // Org
  organizations: Organization[];
  orgMembers: OrgMember[];
  currentOrgId: string | null;

  // Workflows
  workflows: Workflow[];

  // Runs
  runs: WorkflowRun[];

  // UI
  toasts: Toast[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ---- Seed Data ----

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const USERS: User[] = [
  { id: 'user-owner-a', email: 'alice@orga.com', displayName: 'Alice (Owner)' },
  { id: 'user-editor-a', email: 'bob@orga.com', displayName: 'Bob (Editor)' },
  { id: 'user-viewer-a', email: 'carol@orga.com', displayName: 'Carol (Viewer)' },
  { id: 'user-owner-b', email: 'dave@orgb.com', displayName: 'Dave (Org B Owner)' },
];

const ORGS: Organization[] = [
  { id: 'org-a', name: 'Acme Corp', quota_allowed: 100, quota_used: 37, quota_period: 'monthly', created_at: '2026-07-01T00:00:00Z' },
  { id: 'org-b', name: 'Globex Inc', quota_allowed: 50, quota_used: 12, quota_period: 'monthly', created_at: '2026-07-15T00:00:00Z' },
];

const ORG_MEMBERS: OrgMember[] = [
  { id: 'm1', org_id: 'org-a', user_id: 'user-owner-a', role: 'owner', user: USERS[0] },
  { id: 'm2', org_id: 'org-a', user_id: 'user-editor-a', role: 'editor', user: USERS[1] },
  { id: 'm3', org_id: 'org-a', user_id: 'user-viewer-a', role: 'viewer', user: USERS[2] },
  { id: 'm4', org_id: 'org-b', user_id: 'user-owner-b', role: 'owner', user: USERS[3] },
];

const SEEDED_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-demo-1',
    org_id: 'org-a',
    name: 'Customer Feedback & Escalation Pipeline',
    description: 'Chains AI sentiment analysis, conditional escalation, human-in-the-loop approval, database persistence, and alerts.',
    created_by: 'user-owner-a',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-09T12:00:00Z',
    triggers: [
      { id: 'trig-1', workflow_id: 'wf-demo-1', type: 'manual', config: {}, enabled: true },
      { id: 'trig-2', workflow_id: 'wf-demo-1', type: 'webhook', config: { token: 'wh_customer_feedback_99' }, enabled: true },
    ],
    steps: [
      {
        id: 'step-1',
        workflow_id: 'wf-demo-1',
        position: 0,
        type: 'llm_call',
        name: 'Analyze Review Sentiment',
        config: {
          prompt: 'Analyze the sentiment and key topics of this customer feedback. Respond with sentiment (positive/negative) and summary.',
          model: 'gemini-2.0-flash',
          temperature: 0.7,
          max_tokens: 500,
        },
      },
      {
        id: 'step-2',
        workflow_id: 'wf-demo-1',
        position: 1,
        type: 'conditional_branch',
        name: 'Check Negative Sentiment',
        config: {
          field: 'sentiment',
          operator: '==',
          value: 'negative',
        },
      },
      {
        id: 'step-3',
        workflow_id: 'wf-demo-1',
        position: 2,
        type: 'approval_gate',
        name: 'Manager Escalation Approval',
        config: {
          required_role: 'editor',
          message: 'Negative feedback detected. Require manager approval before notifying executive team and updating CRM record.',
        },
      },
      {
        id: 'step-4',
        workflow_id: 'wf-demo-1',
        position: 3,
        type: 'db_write',
        name: 'Save CRM Ticket Record',
        config: {
          table: 'customer_escalations',
          data: '{{previous_output}}',
        },
      },
      {
        id: 'step-5',
        workflow_id: 'wf-demo-1',
        position: 4,
        type: 'notify',
        name: 'Alert Support Team',
        config: {
          channel: 'system',
          message: 'High priority customer ticket escalated and saved to database.',
        },
      },
    ],
  },
  {
    id: 'wf-demo-2',
    org_id: 'org-a',
    name: 'External API Sync & AI Summarizer',
    description: 'Fetches external data via HTTP, runs AI summary extraction, and writes to database tables.',
    created_by: 'user-editor-a',
    created_at: '2026-08-05T14:30:00Z',
    updated_at: '2026-08-08T09:15:00Z',
    triggers: [
      { id: 'trig-3', workflow_id: 'wf-demo-2', type: 'scheduled', config: { cron: '0 9 * * *' }, enabled: true },
    ],
    steps: [
      {
        id: 'step-21',
        workflow_id: 'wf-demo-2',
        position: 0,
        type: 'http_request',
        name: 'Fetch Latest Metrics API',
        config: {
          url: 'https://api.github.com/zen',
          method: 'GET',
          headers: {},
        },
      },
      {
        id: 'step-22',
        workflow_id: 'wf-demo-2',
        position: 1,
        type: 'llm_call',
        name: 'Extract Action Points',
        config: {
          prompt: 'Extract key takeaways and action points from this metric payload.',
          model: 'gemini-2.0-flash',
        },
      },
      {
        id: 'step-23',
        workflow_id: 'wf-demo-2',
        position: 2,
        type: 'db_write',
        name: 'Store Daily Insights',
        config: {
          table: 'daily_insights',
          data: '{{previous_output}}',
        },
      },
    ],
  },
];

const SEEDED_RUNS: WorkflowRun[] = [
  {
    id: 'run-paused-demo-8812',
    workflow_id: 'wf-demo-1',
    workflow_name: 'Customer Feedback & Escalation Pipeline',
    triggered_by: 'user-editor-a',
    trigger_type: 'webhook',
    status: 'paused',
    input: {
      feedback: 'Product crashed twice during initial setup. Very frustrated with customer support delay.',
      customer_id: 'cust_88192',
    },
    output: {},
    error: null,
    started_at: new Date(Date.now() - 120000).toISOString(),
    completed_at: null,
    step_runs: [
      {
        id: 'sr-1',
        workflow_run_id: 'run-paused-demo-8812',
        workflow_step_id: 'step-1',
        position: 0,
        step_type: 'llm_call',
        step_name: 'Analyze Review Sentiment',
        status: 'completed',
        input: { feedback: 'Product crashed twice during initial setup. Very frustrated with customer support delay.', customer_id: 'cust_88192' },
        output: {
          analysis: 'Customer expresses strong dissatisfaction regarding product stability and support delay.',
          sentiment: 'negative',
          confidence: '0.98',
          model: 'gemini-2.0-flash',
          provider: 'gemini',
        },
        error: null,
        attempt_count: 1,
        approved_by: null,
        approved_at: null,
        started_at: new Date(Date.now() - 120000).toISOString(),
        completed_at: new Date(Date.now() - 118000).toISOString(),
      },
      {
        id: 'sr-2',
        workflow_run_id: 'run-paused-demo-8812',
        workflow_step_id: 'step-2',
        position: 1,
        step_type: 'conditional_branch',
        step_name: 'Check Negative Sentiment',
        status: 'completed',
        input: { sentiment: 'negative', confidence: '0.98' },
        output: { field: 'sentiment', operator: '==', value: 'negative', actual_value: 'negative', condition_met: true },
        error: null,
        attempt_count: 1,
        approved_by: null,
        approved_at: null,
        started_at: new Date(Date.now() - 117000).toISOString(),
        completed_at: new Date(Date.now() - 116000).toISOString(),
      },
      {
        id: 'sr-3',
        workflow_run_id: 'run-paused-demo-8812',
        workflow_step_id: 'step-3',
        position: 2,
        step_type: 'approval_gate',
        step_name: 'Manager Escalation Approval',
        status: 'paused',
        input: { field: 'sentiment', operator: '==', value: 'negative', actual_value: 'negative', condition_met: true },
        output: { requires_approval: true, required_role: 'editor' },
        error: null,
        attempt_count: 1,
        approved_by: null,
        approved_at: null,
        started_at: new Date(Date.now() - 115000).toISOString(),
        completed_at: null,
      },
      {
        id: 'sr-4',
        workflow_run_id: 'run-paused-demo-8812',
        workflow_step_id: 'step-4',
        position: 3,
        step_type: 'db_write',
        step_name: 'Save CRM Ticket Record',
        status: 'pending',
        input: {},
        output: {},
        error: null,
        attempt_count: 0,
        approved_by: null,
        approved_at: null,
        started_at: null,
        completed_at: null,
      },
      {
        id: 'sr-5',
        workflow_run_id: 'run-paused-demo-8812',
        workflow_step_id: 'step-5',
        position: 4,
        step_type: 'notify',
        step_name: 'Alert Support Team',
        status: 'pending',
        input: {},
        output: {},
        error: null,
        attempt_count: 0,
        approved_by: null,
        approved_at: null,
        started_at: null,
        completed_at: null,
      },
    ],
  },
];

const INITIAL_STATE: AppState = {
  currentUser: null,
  isAuthenticated: false,
  organizations: ORGS,
  orgMembers: ORG_MEMBERS,
  currentOrgId: null,
  workflows: SEEDED_WORKFLOWS,
  runs: SEEDED_RUNS,
  toasts: [],
};

// ---- Actions ----

type Action =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_ORG'; orgId: string }
  | { type: 'ADD_WORKFLOW'; workflow: Workflow }
  | { type: 'UPDATE_WORKFLOW'; workflow: Workflow }
  | { type: 'DELETE_WORKFLOW'; workflowId: string }
  | { type: 'ADD_RUN'; run: WorkflowRun }
  | { type: 'UPDATE_RUN'; run: WorkflowRun }
  | { type: 'UPDATE_STEP_RUN'; runId: string; stepRun: StepRun }
  | { type: 'INCREMENT_QUOTA'; orgId: string }
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'REMOVE_TOAST'; toastId: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN': {
      const userOrgs = state.orgMembers.filter(m => m.user_id === action.user.id);
      const firstOrgId = userOrgs.length > 0 ? userOrgs[0].org_id : null;
      return { ...state, currentUser: action.user, isAuthenticated: true, currentOrgId: firstOrgId };
    }
    case 'LOGOUT':
      return { ...state, currentUser: null, isAuthenticated: false, currentOrgId: null };
    case 'SET_ORG':
      return { ...state, currentOrgId: action.orgId };
    case 'ADD_WORKFLOW':
      return { ...state, workflows: [...state.workflows, action.workflow] };
    case 'UPDATE_WORKFLOW':
      return { ...state, workflows: state.workflows.map(w => w.id === action.workflow.id ? action.workflow : w) };
    case 'DELETE_WORKFLOW':
      return { ...state, workflows: state.workflows.filter(w => w.id !== action.workflowId) };
    case 'ADD_RUN':
      return { ...state, runs: [action.run, ...state.runs] };
    case 'UPDATE_RUN':
      return { ...state, runs: state.runs.map(r => r.id === action.run.id ? action.run : r) };
    case 'UPDATE_STEP_RUN': {
      return {
        ...state,
        runs: state.runs.map(r => {
          if (r.id !== action.runId) return r;
          return {
            ...r,
            step_runs: r.step_runs.map(sr => sr.id === action.stepRun.id ? action.stepRun : sr),
          };
        }),
      };
    }
    case 'INCREMENT_QUOTA':
      return {
        ...state,
        organizations: state.organizations.map(o =>
          o.id === action.orgId ? { ...o, quota_used: o.quota_used + 1 } : o
        ),
      };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.toastId) };
    default:
      return state;
  }
}

// ---- Context ----

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience methods
  login: (email: string) => boolean;
  logout: () => void;
  switchOrg: (orgId: string) => void;
  getCurrentOrg: () => Organization | null;
  getCurrentRole: () => OrgRole | null;
  getOrgMembers: (orgId: string) => OrgMember[];
  getOrgWorkflows: (orgId: string) => Workflow[];
  getOrgRuns: (orgId: string) => WorkflowRun[];
  createWorkflow: (name: string, description: string) => Workflow;
  updateWorkflow: (workflow: Workflow) => void;
  deleteWorkflow: (workflowId: string) => void;
  triggerRun: (workflowId: string, input?: Record<string, unknown>) => WorkflowRun | null;
  approveStep: (runId: string, stepRunId: string) => void;
  addToast: (type: Toast['type'], message: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = uuid();
    dispatch({ type: 'ADD_TOAST', toast: { id, type, message } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', toastId: id }), 4000);
  }, []);

  const login = useCallback((email: string): boolean => {
    const user = USERS.find(u => u.email === email);
    if (user) {
      dispatch({ type: 'LOGIN', user });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, []);

  const switchOrg = useCallback((orgId: string) => {
    dispatch({ type: 'SET_ORG', orgId });
  }, []);

  const getCurrentOrg = useCallback((): Organization | null => {
    return stateRef.current.organizations.find(o => o.id === stateRef.current.currentOrgId) || null;
  }, []);

  const getCurrentRole = useCallback((): OrgRole | null => {
    const { currentUser, currentOrgId, orgMembers } = stateRef.current;
    if (!currentUser || !currentOrgId) return null;
    const member = orgMembers.find(m => m.user_id === currentUser.id && m.org_id === currentOrgId);
    return member?.role || null;
  }, []);

  const getOrgMembers = useCallback((orgId: string): OrgMember[] => {
    return stateRef.current.orgMembers.filter(m => m.org_id === orgId);
  }, []);

  const getOrgWorkflows = useCallback((orgId: string): Workflow[] => {
    return stateRef.current.workflows.filter(w => w.org_id === orgId);
  }, []);

  const getOrgRuns = useCallback((orgId: string): WorkflowRun[] => {
    const orgWorkflows = stateRef.current.workflows.filter(w => w.org_id === orgId);
    const wfIds = new Set(orgWorkflows.map(w => w.id));
    return stateRef.current.runs.filter(r => wfIds.has(r.workflow_id));
  }, []);

  const createWorkflow = useCallback((name: string, description: string): Workflow => {
    const workflow: Workflow = {
      id: uuid(),
      org_id: stateRef.current.currentOrgId!,
      name,
      description,
      created_by: stateRef.current.currentUser!.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      steps: [],
      triggers: [{ id: uuid(), workflow_id: '', type: 'manual', config: {}, enabled: true }],
    };
    workflow.triggers[0].workflow_id = workflow.id;
    dispatch({ type: 'ADD_WORKFLOW', workflow });
    return workflow;
  }, []);

  const updateWorkflow = useCallback((workflow: Workflow) => {
    dispatch({ type: 'UPDATE_WORKFLOW', workflow: { ...workflow, updated_at: new Date().toISOString() } });
  }, []);

  const deleteWorkflow = useCallback((workflowId: string) => {
    dispatch({ type: 'DELETE_WORKFLOW', workflowId });
  }, []);

  // ---- Execution Engine (client-side simulation) ----

  const executeStep = useCallback(async (
    run: WorkflowRun,
    step: WorkflowStep,
    stepRun: StepRun,
    prevOutput: Record<string, unknown>,
    dispatchFn: React.Dispatch<Action>,
  ): Promise<{ output: Record<string, unknown>; skip: boolean; pause: boolean }> => {
    // Simulate execution delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Mark running
    const runningStepRun: StepRun = { ...stepRun, status: 'running', started_at: new Date().toISOString(), attempt_count: stepRun.attempt_count + 1, input: prevOutput };
    dispatchFn({ type: 'UPDATE_STEP_RUN', runId: run.id, stepRun: runningStepRun });

    await delay(800 + Math.random() * 1200); // 0.8–2s realistic delay

    switch (step.type) {
      case 'llm_call': {
        const promptTemplate = (step.config.prompt as string) || 'Analyze this input';
        const model = (step.config.model as string) || 'gemini-2.0-flash';
        const temperature = (step.config.temperature as number) ?? 0.7;
        const maxTokens = (step.config.max_tokens as number) ?? 1024;
        const userApiKey = typeof window !== 'undefined' ? localStorage.getItem('agentflow_api_key') || '' : '';
        const userProvider = typeof window !== 'undefined' ? localStorage.getItem('agentflow_llm_provider') || 'gemini' : 'gemini';

        // Prepare full prompt
        const prompt = `${promptTemplate}\n\nInput Context: ${JSON.stringify(prevOutput)}`;

        try {
          const res = await fetch('/api/llm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              provider: userProvider,
              model,
              apiKey: userApiKey,
              temperature,
              maxTokens,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.text || '';
            const lowerText = text.toLowerCase();
            const sentiment = lowerText.includes('negative') || lowerText.includes('bad') || lowerText.includes('poor') ? 'negative' : 'positive';

            return {
              output: {
                analysis: text,
                sentiment,
                confidence: "0.95",
                model: data.model || model,
                provider: data.provider || userProvider,
                usage: data.usage || null,
                is_real_llm: true,
              },
              skip: false,
              pause: false,
            };
          }
        } catch {
          // Fallback to simulated response if network error or missing key
        }

        // Fallback simulation when API key is missing or invalid
        const output = {
          analysis: `[Simulated LLM Response] Analysis of input: "${JSON.stringify(prevOutput).slice(0, 100)}..."`,
          sentiment: Math.random() > 0.3 ? 'positive' : 'negative',
          confidence: (0.7 + Math.random() * 0.3).toFixed(2),
          prompt_used: promptTemplate,
          note: 'To use live LLM calls, set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in frontend/.env.local or click 🔑 API Keys in the app header.',
          is_real_llm: false,
        };
        return { output, skip: false, pause: false };
      }
      case 'http_request': {
        const url = (step.config.url as string) || 'https://api.example.com/data';
        const output = {
          status_code: 200,
          url_called: url,
          response: { success: true, data: { processed: true, timestamp: new Date().toISOString() } },
        };
        return { output, skip: false, pause: false };
      }
      case 'conditional_branch': {
        const field = (step.config.field as string) || 'sentiment';
        const operator = (step.config.operator as string) || '==';
        const value = (step.config.value as string) || 'negative';
        const fieldValue = String(prevOutput[field] ?? '');
        let conditionMet = false;
        switch (operator) {
          case '==': conditionMet = fieldValue === value; break;
          case '!=': conditionMet = fieldValue !== value; break;
          case 'contains': conditionMet = fieldValue.includes(value); break;
          default: conditionMet = fieldValue === value;
        }
        return {
          output: { field, operator, value, actual_value: fieldValue, condition_met: conditionMet },
          skip: !conditionMet,
          pause: false,
        };
      }
      case 'approval_gate': {
        return { output: { requires_approval: true, required_role: step.config.required_role || 'editor' }, skip: false, pause: true };
      }
      case 'db_write': {
        const output = {
          table: (step.config.table as string) || 'results',
          rows_written: 1,
          record_id: uuid(),
          data: prevOutput,
        };
        return { output, skip: false, pause: false };
      }
      case 'notify': {
        const message = (step.config.message as string) || 'Workflow step completed';
        return {
          output: { notification_sent: true, channel: 'system', message, timestamp: new Date().toISOString() },
          skip: false,
          pause: false,
        };
      }
      default:
        return { output: {}, skip: false, pause: false };
    }
  }, []);

  const runStepsSequentially = useCallback(async (
    run: WorkflowRun,
    steps: WorkflowStep[],
    startIdx: number,
    prevOutput: Record<string, unknown>,
    dispatchFn: React.Dispatch<Action>,
  ) => {
    let output = prevOutput;

    for (let i = startIdx; i < steps.length; i++) {
      const step = steps[i];
      const stepRun = run.step_runs[i];
      if (!stepRun || stepRun.status === 'completed' || stepRun.status === 'skipped') continue;

      try {
        const result = await executeStep(run, step, stepRun, output, dispatchFn);

        if (result.pause) {
          // Approval gate — pause
          const pausedStepRun: StepRun = { ...stepRun, status: 'paused', output: result.output, input: output, started_at: stepRun.started_at || new Date().toISOString() };
          dispatchFn({ type: 'UPDATE_STEP_RUN', runId: run.id, stepRun: pausedStepRun });
          const pausedRun: WorkflowRun = { ...run, status: 'paused', step_runs: run.step_runs.map(sr => sr.id === stepRun.id ? pausedStepRun : sr) };
          dispatchFn({ type: 'UPDATE_RUN', run: pausedRun });
          return; // Stop execution
        }

        if (result.skip) {
          // Condition not met — skip
          const skippedStepRun: StepRun = { ...stepRun, status: 'skipped', output: result.output, input: output, completed_at: new Date().toISOString(), started_at: stepRun.started_at || new Date().toISOString() };
          dispatchFn({ type: 'UPDATE_STEP_RUN', runId: run.id, stepRun: skippedStepRun });
          run = { ...run, step_runs: run.step_runs.map(sr => sr.id === stepRun.id ? skippedStepRun : sr) };
          continue;
        }

        // Success
        const completedStepRun: StepRun = { ...stepRun, status: 'completed', output: result.output, input: output, completed_at: new Date().toISOString(), started_at: stepRun.started_at || new Date().toISOString() };
        dispatchFn({ type: 'UPDATE_STEP_RUN', runId: run.id, stepRun: completedStepRun });
        run = { ...run, step_runs: run.step_runs.map(sr => sr.id === stepRun.id ? completedStepRun : sr) };
        output = result.output;
      } catch (err) {
        const failedStepRun: StepRun = { ...stepRun, status: 'failed', error: String(err), completed_at: new Date().toISOString(), started_at: stepRun.started_at || new Date().toISOString() };
        dispatchFn({ type: 'UPDATE_STEP_RUN', runId: run.id, stepRun: failedStepRun });
        const failedRun: WorkflowRun = { ...run, status: 'failed', error: String(err), completed_at: new Date().toISOString(), step_runs: run.step_runs.map(sr => sr.id === stepRun.id ? failedStepRun : sr) };
        dispatchFn({ type: 'UPDATE_RUN', run: failedRun });
        return;
      }
    }

    // All steps done
    const completedRun: WorkflowRun = { ...run, status: 'completed', completed_at: new Date().toISOString(), step_runs: run.step_runs };
    dispatchFn({ type: 'UPDATE_RUN', run: completedRun });
    // Increment quota
    const workflow = stateRef.current.workflows.find(w => w.id === run.workflow_id);
    if (workflow) {
      dispatchFn({ type: 'INCREMENT_QUOTA', orgId: workflow.org_id });
    }
  }, [executeStep]);

  const triggerRun = useCallback((workflowId: string, input: Record<string, unknown> = {}): WorkflowRun | null => {
    const currentState = stateRef.current;
    const workflow = currentState.workflows.find(w => w.id === workflowId);
    if (!workflow) { addToast('error', 'Workflow not found'); return null; }

    // Check org membership (Layer 2)
    const member = currentState.orgMembers.find(m => m.user_id === currentState.currentUser?.id && m.org_id === workflow.org_id);
    if (!member) { addToast('error', 'Access denied: not a member of this organization'); return null; }
    if (member.role === 'viewer') { addToast('error', 'Access denied: viewers cannot run workflows'); return null; }

    // Check quota
    const org = currentState.organizations.find(o => o.id === workflow.org_id);
    if (org && org.quota_used >= org.quota_allowed) { addToast('error', `Quota exceeded: ${org.quota_used}/${org.quota_allowed} runs used`); return null; }

    if (workflow.steps.length === 0) { addToast('error', 'Workflow has no steps'); return null; }

    // Create run + step_runs
    const runId = uuid();
    const stepRuns: StepRun[] = workflow.steps
      .sort((a, b) => a.position - b.position)
      .map(step => ({
        id: uuid(),
        workflow_run_id: runId,
        workflow_step_id: step.id,
        position: step.position,
        step_type: step.type,
        step_name: step.name,
        status: 'pending' as StepRunStatus,
        input: {},
        output: {},
        error: null,
        attempt_count: 0,
        approved_by: null,
        approved_at: null,
        started_at: null,
        completed_at: null,
      }));

    const run: WorkflowRun = {
      id: runId,
      workflow_id: workflowId,
      workflow_name: workflow.name,
      triggered_by: currentState.currentUser!.id,
      trigger_type: 'manual',
      status: 'running',
      input,
      output: {},
      error: null,
      started_at: new Date().toISOString(),
      completed_at: null,
      step_runs: stepRuns,
    };

    dispatch({ type: 'ADD_RUN', run });
    addToast('info', `Workflow "${workflow.name}" started`);

    // Start async execution
    const sortedSteps = [...workflow.steps].sort((a, b) => a.position - b.position);
    setTimeout(() => {
      runStepsSequentially(run, sortedSteps, 0, input, dispatch);
    }, 300);

    return run;
  }, [addToast, runStepsSequentially]);

  const approveStep = useCallback((runId: string, stepRunId: string) => {
    const currentState = stateRef.current;
    const run = currentState.runs.find(r => r.id === runId);
    if (!run) { addToast('error', 'Run not found'); return; }

    const workflow = currentState.workflows.find(w => w.id === run.workflow_id);
    if (!workflow) { addToast('error', 'Workflow not found'); return; }

    // Check permission
    const member = currentState.orgMembers.find(m => m.user_id === currentState.currentUser?.id && m.org_id === workflow.org_id);
    if (!member || member.role === 'viewer') { addToast('error', 'Access denied: insufficient role to approve'); return; }

    const stepRun = run.step_runs.find(sr => sr.id === stepRunId);
    if (!stepRun || stepRun.status !== 'paused') { addToast('error', 'Step is not awaiting approval'); return; }

    // Approve the step
    const approvedStepRun: StepRun = {
      ...stepRun,
      status: 'completed',
      approved_by: currentState.currentUser!.id,
      approved_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    dispatch({ type: 'UPDATE_STEP_RUN', runId, stepRun: approvedStepRun });

    // Resume run
    const updatedRun: WorkflowRun = {
      ...run,
      status: 'running',
      step_runs: run.step_runs.map(sr => sr.id === stepRunId ? approvedStepRun : sr),
    };
    dispatch({ type: 'UPDATE_RUN', run: updatedRun });
    addToast('success', 'Step approved — resuming workflow');

    // Continue from next step
    const sortedSteps = [...workflow.steps].sort((a, b) => a.position - b.position);
    const nextIdx = stepRun.position; // position is 0-indexed in our steps array
    setTimeout(() => {
      runStepsSequentially(updatedRun, sortedSteps, nextIdx, stepRun.output, dispatch);
    }, 500);
  }, [addToast, runStepsSequentially]);

  const contextValue: StoreContextType = {
    state,
    dispatch,
    login,
    logout,
    switchOrg,
    getCurrentOrg,
    getCurrentRole,
    getOrgMembers,
    getOrgWorkflows,
    getOrgRuns,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    triggerRun,
    approveStep,
    addToast,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export { USERS };
