import type { Message, Tool } from '../types';

export const CONTEXT_BYTES_PER_TOKEN = 3;
export const MAX_CONTEXT_TOOL_RESULT_TOKENS = 2_048;

export interface ModelContextBudgetInput {
	systemPrompt?: string;
	messages: Message[];
	tools: Tool[];
	maxInputTokens: number;
}

export interface ModelContextBudgetResult {
	systemPrompt?: string;
	messages: Message[];
	tools: Tool[];
	estimatedTokens: number;
}

export function fitModelContext(input: ModelContextBudgetInput): ModelContextBudgetResult {
	const maxInputTokens = Math.max(256, Math.floor(input.maxInputTokens));
	const toolView = input.tools.map((tool) => ({
		name: tool.name,
		description: tool.description,
		schema: tool.schema,
	}));
	const fullTokens =
		Math.ceil(
			Buffer.byteLength(
				JSON.stringify({
					systemPrompt: input.systemPrompt ?? '',
					messages: input.messages,
					tools: toolView,
				}),
				'utf8'
			) / CONTEXT_BYTES_PER_TOKEN
		) + 32;
	if (fullTokens <= maxInputTokens) {
		return {
			systemPrompt: input.systemPrompt,
			messages: input.messages,
			tools: input.tools,
			estimatedTokens: fullTokens,
		};
	}

	const messages = structuredClone(input.messages);
	for (const message of messages) {
		if (message.role !== 'assistant') continue;
		if (Array.isArray(message.content)) {
			message.content = message.content.map((block) => {
				if (block.type !== 'provider_item') return block;
				const bytes = Buffer.byteLength(JSON.stringify(block), 'utf8');
				return bytes / CONTEXT_BYTES_PER_TOKEN > MAX_CONTEXT_TOOL_RESULT_TOKENS
					? { type: 'text', text: `[provider state omitted: ${bytes} bytes]` }
					: block;
			});
		}
		message.toolCalls = message.toolCalls?.map((call) => {
			const argsBytes = Buffer.byteLength(JSON.stringify(call.args), 'utf8');
			const resultBytes = call.result
				? Buffer.byteLength(JSON.stringify(call.result.content), 'utf8')
				: 0;
			return {
				...call,
				...(argsBytes / CONTEXT_BYTES_PER_TOKEN > MAX_CONTEXT_TOOL_RESULT_TOKENS
					? { args: { omitted: `[tool arguments omitted: ${argsBytes} bytes]` } }
					: {}),
				...(call.result && resultBytes / CONTEXT_BYTES_PER_TOKEN > MAX_CONTEXT_TOOL_RESULT_TOKENS
					? {
							result: {
								...call.result,
								content: `[tool result omitted: ${resultBytes} bytes]`,
							},
						}
					: {}),
			};
		});
	}

	let latestUserIndex = -1;
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index].role !== 'user') continue;
		latestUserIndex = index;
		break;
	}
	if (latestUserIndex < 0) latestUserIndex = Math.max(0, messages.length - 1);
	let selectedMessages = messages.slice(latestUserIndex);
	const currentUser = selectedMessages[0];
	if (currentUser && currentUser.role === 'user' && Array.isArray(currentUser.content)) {
		while (true) {
			const currentTokens =
				Math.ceil(
					Buffer.byteLength(JSON.stringify(selectedMessages), 'utf8') / CONTEXT_BYTES_PER_TOKEN
				) + 32;
			if (currentTokens <= maxInputTokens - 512) break;
			let largestIndex = -1;
			let largestBytes = 0;
			for (const [index, block] of currentUser.content.entries()) {
				if ((block.type !== 'image' && block.type !== 'file') || typeof block.base64 !== 'string')
					continue;
				const bytes = Buffer.byteLength(block.base64, 'utf8');
				if (bytes <= largestBytes) continue;
				largestIndex = index;
				largestBytes = bytes;
			}
			if (largestIndex < 0) break;
			const block = currentUser.content[largestIndex];
			currentUser.content[largestIndex] = {
				type: 'text',
				text: `[attachment payload omitted to fit model context: ${typeof block.name === 'string' ? block.name : 'unnamed'}; ${typeof block.mimeType === 'string' ? block.mimeType : 'unknown type'}; ${largestBytes} base64 bytes]`,
			};
		}
	}

	const minimumSystem = (input.systemPrompt ?? '').slice(0, 1_536);
	let systemPrompt = input.systemPrompt ?? '';
	let mandatoryTokens =
		Math.ceil(
			Buffer.byteLength(
				JSON.stringify({
					systemPrompt: minimumSystem,
					messages: selectedMessages,
					tools: toolView,
				}),
				'utf8'
			) / CONTEXT_BYTES_PER_TOKEN
		) + 32;
	if (mandatoryTokens > maxInputTokens) {
		throw new Error(
			'The current user turn and available tool schemas exceed the model context budget.'
		);
	}

	mandatoryTokens =
		Math.ceil(
			Buffer.byteLength(
				JSON.stringify({ systemPrompt, messages: selectedMessages, tools: toolView }),
				'utf8'
			) / CONTEXT_BYTES_PER_TOKEN
		) + 32;
	if (mandatoryTokens > maxInputTokens) {
		const marker = '\n\n[Additional system context omitted to fit the model context budget.]';
		const excessCharacters = (mandatoryTokens - maxInputTokens) * CONTEXT_BYTES_PER_TOKEN;
		systemPrompt = `${systemPrompt.slice(0, Math.max(minimumSystem.length, systemPrompt.length - excessCharacters - marker.length))}${marker}`;
		while (
			Math.ceil(
				Buffer.byteLength(
					JSON.stringify({ systemPrompt, messages: selectedMessages, tools: toolView }),
					'utf8'
				) / CONTEXT_BYTES_PER_TOKEN
			) +
				32 >
			maxInputTokens
		) {
			if (systemPrompt.length <= minimumSystem.length + marker.length) {
				systemPrompt = minimumSystem;
				break;
			}
			systemPrompt = `${systemPrompt.slice(0, -Math.min(512, systemPrompt.length - minimumSystem.length - marker.length) - marker.length)}${marker}`;
		}
	}

	const selectedTools = input.tools;

	let cursor = latestUserIndex;
	let omittedPrior = false;
	while (cursor > 0) {
		let previousUserIndex = cursor - 1;
		while (previousUserIndex > 0 && messages[previousUserIndex].role !== 'user') {
			previousUserIndex -= 1;
		}
		const candidateMessages = [...messages.slice(previousUserIndex, cursor), ...selectedMessages];
		const candidateTokens =
			Math.ceil(
				Buffer.byteLength(
					JSON.stringify({ systemPrompt, messages: candidateMessages, tools: toolView }),
					'utf8'
				) / CONTEXT_BYTES_PER_TOKEN
			) + 32;
		if (candidateTokens > maxInputTokens) {
			omittedPrior = true;
			break;
		}
		selectedMessages = candidateMessages;
		cursor = previousUserIndex;
	}

	if (omittedPrior) {
		const marker: Message = {
			role: 'user',
			content: '[Earlier conversation omitted to fit the model context budget.]',
		};
		const candidateMessages = [marker, ...selectedMessages];
		const markerTokens =
			Math.ceil(
				Buffer.byteLength(
					JSON.stringify({ systemPrompt, messages: candidateMessages, tools: toolView }),
					'utf8'
				) / CONTEXT_BYTES_PER_TOKEN
			) + 32;
		if (markerTokens <= maxInputTokens) selectedMessages = candidateMessages;
	}

	const estimatedTokens =
		Math.ceil(
			Buffer.byteLength(
				JSON.stringify({ systemPrompt, messages: selectedMessages, tools: toolView }),
				'utf8'
			) / CONTEXT_BYTES_PER_TOKEN
		) + 32;
	return {
		systemPrompt: systemPrompt || undefined,
		messages: selectedMessages,
		tools: selectedTools,
		estimatedTokens,
	};
}
