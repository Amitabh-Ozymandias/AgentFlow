export interface StepExecutionContext {
    stepType: string;
    config: Record<string, unknown>;
    input: Record<string, unknown>;
    previousOutput: Record<string, unknown>;
}
export interface StepExecutionResult {
    output: Record<string, unknown>;
    status: 'completed' | 'paused' | 'skipped' | 'failed';
    error?: string;
}
export declare function executeStep(ctx: StepExecutionContext): Promise<StepExecutionResult>;
//# sourceMappingURL=step-executors.d.ts.map