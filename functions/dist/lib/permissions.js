"use strict";
// ============================================================
// Layer 2 Permissions Check — Function Authorization
// Enforces: "Can this user perform this specific operation right now?"
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWorkflowPermission = checkWorkflowPermission;
exports.checkQuota = checkQuota;
exports.checkPrivilegedStepPermission = checkPrivilegedStepPermission;
function checkWorkflowPermission(ctx, action) {
    if (!ctx.userId || !ctx.orgId) {
        return { allowed: false, reason: 'Unauthenticated or organization context missing' };
    }
    switch (action) {
        case 'read':
            return { allowed: true }; // Owner, Editor, Viewer can read
        case 'create':
        case 'update':
        case 'run':
            if (ctx.role === 'owner' || ctx.role === 'editor') {
                return { allowed: true };
            }
            return { allowed: false, reason: `Role '${ctx.role}' is not allowed to ${action} workflows. Required: owner or editor.` };
        case 'approve':
            if (ctx.role === 'owner' || ctx.role === 'editor') {
                return { allowed: true };
            }
            return { allowed: false, reason: `Role '${ctx.role}' cannot approve step runs. Required: owner or editor.` };
        case 'delete':
            if (ctx.role === 'owner') {
                return { allowed: true };
            }
            return { allowed: false, reason: `Role '${ctx.role}' cannot delete workflows. Required: owner.` };
        default:
            return { allowed: false, reason: 'Unknown action' };
    }
}
function checkQuota(quotaUsed, quotaAllowed) {
    if (quotaUsed >= quotaAllowed) {
        return {
            allowed: false,
            reason: `Organization run quota exceeded (${quotaUsed}/${quotaAllowed}).`,
        };
    }
    return { allowed: true };
}
function checkPrivilegedStepPermission(ctx, stepTypeOrTriggerType) {
    const privilegedTypes = ['db_write', 'notify', 'webhook'];
    if (privilegedTypes.includes(stepTypeOrTriggerType)) {
        if (ctx.role !== 'owner') {
            return {
                allowed: false,
                reason: `Layer 2 Security: Configured privileged step/trigger '${stepTypeOrTriggerType}' requires 'owner' role. Current role: '${ctx.role}'.`,
            };
        }
    }
    return { allowed: true };
}
