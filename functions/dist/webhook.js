"use strict";
// ============================================================
// Nhost Function — webhook trigger handler
// Public endpoint for handling external webhook POST triggers
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = webhookHandler;
async function webhookHandler(req, res) {
    try {
        const token = req.params.token || req.query.token;
        const body = req.body || {};
        if (!token) {
            return res.status(400).json({ error: 'Webhook token missing' });
        }
        return res.status(200).json({
            success: true,
            message: `Webhook trigger received for token ${token}`,
            payloadReceived: body,
            runId: 'run_wh_' + Math.random().toString(36).slice(2, 9),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
}
//# sourceMappingURL=webhook.js.map