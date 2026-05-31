export type Message =
	| { role: 'user'; content: string }
	| { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
	| { role: 'tool'; toolCallId: string; name: string; content: string; isError?: boolean };

export type ToolCall = {
	id: string;
	name: string;
	input: unknown;
};
