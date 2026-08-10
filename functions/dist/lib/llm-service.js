"use strict";
// ============================================================
// LLM Service — Provider-agnostic LLM wrapper
// Supports: Gemini, OpenRouter, Groq
// Switch providers by changing LLM_PROVIDER env var
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateText = generateText;
const PROVIDER_CONFIGS = {
    gemini: {
        url: 'https://generativelanguage.googleapis.com/v1beta/models',
        defaultModel: 'gemini-2.0-flash',
    },
    openrouter: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        defaultModel: 'google/gemini-2.0-flash-exp:free',
    },
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        defaultModel: 'llama-3.1-70b-versatile',
    },
};
function getProvider() {
    const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
    if (!['gemini', 'openrouter', 'groq'].includes(provider)) {
        throw new Error(`Unknown LLM provider: ${provider}. Use gemini, openrouter, or groq.`);
    }
    return provider;
}
function getApiKey() {
    const provider = getProvider();
    const keyMap = {
        gemini: 'GEMINI_API_KEY',
        openrouter: 'OPENROUTER_API_KEY',
        groq: 'GROQ_API_KEY',
    };
    const key = process.env[keyMap[provider]];
    if (!key) {
        throw new Error(`Missing API key: ${keyMap[provider]}`);
    }
    return key;
}
// ---- Gemini ----
async function callGemini(request) {
    const apiKey = getApiKey();
    const model = process.env.LLM_MODEL || PROVIDER_CONFIGS.gemini.defaultModel;
    const url = `${PROVIDER_CONFIGS.gemini.url}/${model}:generateContent?key=${apiKey}`;
    const body = {
        contents: [
            {
                parts: [{ text: request.prompt }],
            },
        ],
        generationConfig: {
            maxOutputTokens: request.maxTokens || 1024,
            temperature: request.temperature ?? 0.7,
        },
    };
    if (request.systemPrompt) {
        body.systemInstruction = {
            parts: [{ text: request.systemPrompt }],
        };
    }
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usageMetadata = data.usageMetadata;
    return {
        text,
        usage: usageMetadata
            ? {
                promptTokens: usageMetadata.promptTokenCount || 0,
                completionTokens: usageMetadata.candidatesTokenCount || 0,
                totalTokens: usageMetadata.totalTokenCount || 0,
            }
            : undefined,
        model,
        provider: 'gemini',
    };
}
// ---- OpenAI-compatible (OpenRouter / Groq) ----
async function callOpenAICompatible(request, provider) {
    const apiKey = getApiKey();
    const config = PROVIDER_CONFIGS[provider];
    const model = process.env.LLM_MODEL || config.defaultModel;
    const messages = [];
    if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });
    const response = await fetch(config.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: request.maxTokens || 1024,
            temperature: request.temperature ?? 0.7,
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${provider} API error (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage;
    return {
        text,
        usage: usage
            ? {
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0,
                totalTokens: usage.total_tokens || 0,
            }
            : undefined,
        model,
        provider,
    };
}
// ---- Public API ----
async function generateText(request) {
    const provider = getProvider();
    switch (provider) {
        case 'gemini':
            return callGemini(request);
        case 'openrouter':
        case 'groq':
            return callOpenAICompatible(request, provider);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}
