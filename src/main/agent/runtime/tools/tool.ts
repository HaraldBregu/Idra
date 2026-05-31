import type { ZodSchema } from 'zod';
import type { AgentContext } from '../agent/agent-context';
import type { PermissionDecision } from '../permissions/permission-context';

export type ToolProgress = {
	message: string;
	metadata?: Record<string, unknown>;
};

export type ValidationResult = { ok: true } | { ok: false; message: string };

export type ToolResult<Output> = {
	data: Output;
	content?: string;
};

export type Tool<Input, Output> = {
	name: string;
	description: string;
	inputSchema: ZodSchema<Input>;
	outputSchema?: ZodSchema<Output>;
	prompt(): Promise<string>;
	validateInput?(input: Input, context: AgentContext): Promise<ValidationResult> | ValidationResult;
	checkPermissions(input: Input, context: AgentContext): Promise<PermissionDecision> | PermissionDecision;
	call(input: Input, context: AgentContext, onProgress?: (progress: ToolProgress) => void): Promise<ToolResult<Output>>;
	isReadOnly(input: Input): boolean;
	isDestructive?(input: Input): boolean;
};
