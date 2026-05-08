/**
 * Shared AI types used across main-process AI flows.
 */

export interface ChatMessage {
	readonly role: 'system' | 'user' | 'assistant';
	readonly content: string;
}

export interface ChatModel {
	invoke(messages: ChatMessage[], signal?: AbortSignal): Promise<string>;
	stream(messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<string>;
	/**
	 * @internal Token listener set by the graph runner for real-time
	 * token interception during streaming. Do not use directly.
	 */
	_tokenListener: ((token: string) => void) | null;
}
