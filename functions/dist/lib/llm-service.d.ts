export interface LLMRequest {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
}
export interface LLMResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: string;
}
export declare function generateText(request: LLMRequest): Promise<LLMResponse>;
//# sourceMappingURL=llm-service.d.ts.map