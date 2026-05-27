import { readFileSync } from 'node:fs';
import type { AgentToolResult, ToolContent } from './common';

export function textResult<TDetails = undefined>(
	text: string,
	details?: TDetails
): AgentToolResult<TDetails | undefined> {
	return { content: [{ type: 'text', text }], details };
}

export function jsonResult<TPayload>(payload: TPayload): AgentToolResult<TPayload> {
	return {
		content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
		details: payload,
	};
}

export function payloadTextResult<TPayload>(payload: TPayload): AgentToolResult<TPayload> {
	return {
		content: [
			{
				type: 'text',
				text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
			},
		],
		details: payload,
	};
}

export function imageResult<TDetails = unknown>(input: {
	path?: string;
	base64?: string;
	mimeType: string;
	details: TDetails;
}): AgentToolResult<TDetails> {
	const data = input.base64 ?? (input.path ? readFileSync(input.path).toString('base64') : '');
	const content: ToolContent[] = [{ type: 'image', data, mimeType: input.mimeType }];
	return { content, details: input.details };
}

export function blockedToolResult(input: {
	reason: string;
	deniedReason?: string;
}): AgentToolResult<{ status: 'blocked'; reason: string; deniedReason?: string }> {
	return {
		content: [{ type: 'text', text: input.reason }],
		details: {
			status: 'blocked',
			reason: input.reason,
			deniedReason: input.deniedReason,
		},
	};
}

export function errorToolResult(input: {
	toolName: string;
	error: unknown;
}): AgentToolResult<{ status: 'error'; toolName: string; message: string; name?: string }> {
	const error = input.error instanceof Error ? input.error : new Error(String(input.error));
	return {
		content: [{ type: 'text', text: `tool ${input.toolName} failed: ${error.message}` }],
		details: {
			status: 'error',
			toolName: input.toolName,
			message: error.message,
			name: error.name,
		},
	};
}

