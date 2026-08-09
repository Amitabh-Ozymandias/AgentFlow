export type OrgRole = 'owner' | 'editor' | 'viewer';
export interface UserContext {
    userId: string;
    orgId: string;
    role: OrgRole;
}
export declare function checkWorkflowPermission(ctx: UserContext, action: 'create' | 'read' | 'update' | 'delete' | 'run' | 'approve'): {
    allowed: boolean;
    reason?: string;
};
export declare function checkQuota(quotaUsed: number, quotaAllowed: number): {
    allowed: boolean;
    reason?: string;
};
//# sourceMappingURL=permissions.d.ts.map