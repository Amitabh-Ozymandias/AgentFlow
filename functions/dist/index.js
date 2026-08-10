"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const trigger_workflow_run_1 = __importDefault(require("./trigger-workflow-run"));
const approve_step_1 = __importDefault(require("./approve-step"));
const webhook_1 = __importDefault(require("./webhook"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3550;
app.use(express_1.default.json());
// Nhost / Render Functions API Routes
app.post('/v1/functions/trigger-workflow-run', trigger_workflow_run_1.default);
app.post('/trigger-workflow-run', trigger_workflow_run_1.default);
app.post('/v1/functions/approve-step', approve_step_1.default);
app.post('/approve-step', approve_step_1.default);
app.post('/v1/functions/webhook/:token', webhook_1.default);
app.get('/v1/functions/webhook/:token', webhook_1.default);
app.post('/webhook/:token', webhook_1.default);
app.get('/webhook/:token', webhook_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.listen(port, () => {
    console.log(`Backend Action Functions Server listening on port ${port}`);
});
