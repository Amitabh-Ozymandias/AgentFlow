// ============================================================
// GraphQL Queries and Mutations for Hasura PostgreSQL Backend
// ============================================================

export const GET_ORGANIZATIONS = `
  query GetOrganizations {
    organizations {
      id
      name
      quota_allowed
      quota_used
      quota_period
      created_at
    }
  }
`;

export const GET_ORG_MEMBERS = `
  query GetOrgMembers {
    org_members {
      id
      org_id
      user_id
      role
      created_at
    }
  }
`;

export const GET_WORKFLOWS_BY_ORG = `
  query GetWorkflowsByOrg($org_id: uuid!) {
    workflows(where: { org_id: { _eq: $org_id } }, order_by: { updated_at: desc }) {
      id
      org_id
      name
      description
      created_by
      created_at
      updated_at
      steps: workflow_steps(order_by: { position: asc }) {
        id
        workflow_id
        position
        type
        name
        config
      }
      triggers: workflow_triggers {
        id
        workflow_id
        type
        config
        enabled
      }
    }
  }
`;

export const GET_RUNS_BY_ORG = `
  query GetRunsByOrg($org_id: uuid!) {
    workflow_runs(
      where: { workflow: { org_id: { _eq: $org_id } } }
      order_by: { started_at: desc }
    ) {
      id
      workflow_id
      triggered_by
      trigger_type
      status
      input
      output
      error
      started_at
      completed_at
      step_runs(order_by: { position: asc }) {
        id
        workflow_run_id
        workflow_step_id
        position
        step_type
        step_name
        status
        input
        output
        error
        attempt_count
        approved_by
        approved_at
        started_at
        completed_at
      }
    }
  }
`;

export const INSERT_WORKFLOW = `
  mutation InsertWorkflow(
    $id: uuid!
    $org_id: uuid!
    $name: String!
    $description: String!
    $created_by: uuid
  ) {
    insert_workflows_one(
      object: {
        id: $id
        org_id: $org_id
        name: $name
        description: $description
        created_by: $created_by
      }
    ) {
      id
      org_id
      name
      description
      created_by
      created_at
      updated_at
    }
  }
`;

export const UPDATE_WORKFLOW = `
  mutation UpdateWorkflow($id: uuid!, $name: String!, $description: String!) {
    update_workflows_by_pk(
      pk_columns: { id: $id }
      _set: { name: $name, description: $description, updated_at: "now()" }
    ) {
      id
      name
      description
      updated_at
    }
  }
`;

export const DELETE_WORKFLOW = `
  mutation DeleteWorkflow($id: uuid!) {
    delete_workflows_by_pk(id: $id) {
      id
    }
  }
`;

export const INSERT_WORKFLOW_RUN = `
  mutation InsertWorkflowRun(
    $id: uuid!
    $workflow_id: uuid!
    $triggered_by: uuid
    $trigger_type: trigger_type!
    $status: run_status!
    $input: jsonb
  ) {
    insert_workflow_runs_one(
      object: {
        id: $id
        workflow_id: $workflow_id
        triggered_by: $triggered_by
        trigger_type: $trigger_type
        status: $status
        input: $input
      }
    ) {
      id
      workflow_id
      triggered_by
      trigger_type
      status
      input
      started_at
    }
  }
`;

export const UPDATE_STEP_RUN = `
  mutation UpdateStepRun(
    $id: uuid!
    $status: step_run_status!
    $input: jsonb
    $output: jsonb
    $error: String
    $started_at: timestamptz
    $completed_at: timestamptz
    $approved_by: uuid
    $approved_at: timestamptz
  ) {
    update_step_runs_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: $status
        input: $input
        output: $output
        error: $error
        started_at: $started_at
        completed_at: $completed_at
        approved_by: $approved_by
        approved_at: $approved_at
      }
    ) {
      id
      status
      output
      completed_at
    }
  }
`;

export const UPDATE_WORKFLOW_RUN_STATUS = `
  mutation UpdateWorkflowRunStatus($id: uuid!, $status: run_status!, $error: String, $completed_at: timestamptz) {
    update_workflow_runs_by_pk(
      pk_columns: { id: $id }
      _set: { status: $status, error: $error, completed_at: $completed_at }
    ) {
      id
      status
      completed_at
    }
  }
`;

export const INCREMENT_ORG_QUOTA = `
  mutation IncrementOrgQuota($id: uuid!) {
    update_organizations_by_pk(
      pk_columns: { id: $id }
      _inc: { quota_used: 1 }
    ) {
      id
      quota_used
    }
  }
`;
