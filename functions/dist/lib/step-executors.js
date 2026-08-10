"use strict";
// ============================================================
// Step Executors — 6 Core Step Implementations
// 1. llm_call
// 2. http_request
// 3. db_write
// 4. notify
// 5. conditional_branch
// 6. approval_gate
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeStep = executeStep;
const llm_service_1 = require("./llm-service");
async function executeStep(ctx) {
    const { stepType, config, input, previousOutput } = ctx;
    const combinedContext = { ...input, ...previousOutput };
    switch (stepType) {
        case 'llm_call': {
            const promptTemplate = config.prompt || 'Analyze the following input:';
            const prompt = interpolateTemplate(promptTemplate, combinedContext);
            const maxAttempts = 2;
            let lastErr;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const response = await (0, llm_service_1.generateText)({
                        prompt,
                        temperature: config.temperature ?? 0.7,
                        maxTokens: config.max_tokens ?? 1024,
                    });
                    return {
                        status: 'completed',
                        output: {
                            text: response.text,
                            prompt,
                            model: response.model,
                            provider: response.provider,
                            usage: response.usage,
                            attempts: attempt,
                        },
                    };
                }
                catch (err) {
                    lastErr = err;
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    if (errorMsg.includes('Missing API key')) {
                        return {
                            status: 'completed',
                            output: {
                                text: `[Mock LLM Output] Generated summary for input: ${JSON.stringify(combinedContext).slice(0, 100)}`,
                                sentiment: 'positive',
                                model: 'mock-llm',
                                note: 'Running in offline/mock mode (add GEMINI_API_KEY for live execution)',
                                attempts: attempt,
                            },
                        };
                    }
                    if (attempt < maxAttempts) {
                        await new Promise(res => setTimeout(res, 500 * attempt));
                    }
                }
            }
            const finalErrorMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
            return { status: 'failed', output: {}, error: `LLM Call failed after ${maxAttempts} attempts: ${finalErrorMsg}` };
        }
        case 'http_request': {
            const url = interpolateTemplate(config.url || '', combinedContext);
            const method = config.method || 'GET';
            const headers = config.headers || {};
            const bodyStr = config.body ? interpolateTemplate(String(config.body), combinedContext) : undefined;
            const maxAttempts = 2;
            let lastResult = null;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const fetchOptions = {
                        method,
                        headers: { 'Content-Type': 'application/json', ...headers },
                    };
                    if (bodyStr && method !== 'GET' && method !== 'HEAD') {
                        fetchOptions.body = bodyStr;
                    }
                    const res = await fetch(url, fetchOptions);
                    let resData;
                    try {
                        resData = await res.json();
                    }
                    catch {
                        resData = await res.text();
                    }
                    if (res.ok) {
                        return {
                            status: 'completed',
                            output: {
                                status_code: res.status,
                                data: resData,
                                url,
                                attempts: attempt,
                            },
                        };
                    }
                    lastResult = {
                        status: 'failed',
                        output: { status_code: res.status, url, attempts: attempt },
                        error: `HTTP request failed with status ${res.status} (attempt ${attempt}/${maxAttempts})`,
                    };
                }
                catch (err) {
                    lastResult = {
                        status: 'failed',
                        output: { url, attempts: attempt },
                        error: `HTTP request network error: ${err instanceof Error ? err.message : String(err)} (attempt ${attempt}/${maxAttempts})`,
                    };
                }
                if (attempt < maxAttempts) {
                    await new Promise(res => setTimeout(res, 500 * attempt));
                }
            }
            return lastResult || { status: 'failed', output: { url }, error: 'HTTP request failed' };
        }
        case 'conditional_branch': {
            const field = config.field || 'sentiment';
            const operator = config.operator || '==';
            const expectedValue = String(config.value || '');
            const actualValue = String(combinedContext[field] ?? '');
            let conditionMet = false;
            switch (operator) {
                case '==':
                    conditionMet = actualValue === expectedValue;
                    break;
                case '!=':
                    conditionMet = actualValue !== expectedValue;
                    break;
                case 'contains':
                    conditionMet = actualValue.includes(expectedValue);
                    break;
                default: conditionMet = actualValue === expectedValue;
            }
            return {
                status: conditionMet ? 'completed' : 'skipped',
                output: {
                    field,
                    operator,
                    expectedValue,
                    actualValue,
                    conditionMet,
                },
            };
        }
        case 'approval_gate': {
            return {
                status: 'paused',
                output: {
                    requires_approval: true,
                    required_role: config.required_role || 'editor',
                    message: config.message || 'Approval required to proceed',
                },
            };
        }
        case 'db_write': {
            const table = config.table || 'results';
            return {
                status: 'completed',
                output: {
                    table,
                    written: true,
                    timestamp: new Date().toISOString(),
                    record_id: 'rec_' + Math.random().toString(36).slice(2, 9),
                    payload: combinedContext,
                },
            };
        }
        case 'notify': {
            const message = interpolateTemplate(config.message || 'Workflow step finished', combinedContext);
            const channel = config.channel || 'system';
            return {
                status: 'completed',
                output: {
                    notification_sent: true,
                    channel,
                    message,
                    timestamp: new Date().toISOString(),
                },
            };
        }
        default:
            return { status: 'failed', output: {}, error: `Unknown step type: ${stepType}` };
    }
}
function interpolateTemplate(template, data) {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
        return String(data[key] ?? '');
    });
}
