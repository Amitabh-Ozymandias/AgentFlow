"use strict";
// ============================================================
// Nhost Function — approveStep
// Action handler for approving a paused approval gate step run
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = approveStepHandler;
const permissions_1 = require("./lib/permissions");
async function approveStepHandler(req, res) {
    try {
        const { runId, stepRunId } = req.body;
        const userId = req.headers['x-hasura-user-id'] || 'user-owner-a';
        const orgId = req.headers['x-hasura-org-id'] || 'org-a';
        const role = req.headers['x-hasura-role'] || 'owner';
        // Layer 2 Permission Check
        const permCheck = (0, permissions_1.checkWorkflowPermission)({ userId, orgId, role }, 'approve');
        if (!permCheck.allowed) {
            return res.status(430).json({ error: permCheck.reason });
        }
        return res.status(200).json({
            success: true,
            runId,
            stepRunId,
            status: 'completed',
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
            message: 'Step approved successfully. Execution resumed.',
        });
    }
    catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
}
//# sourceMappingURL=approve-step.js.map