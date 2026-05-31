import type {
	AgentMessage,
	AgentSession,
	BuiltPrompt,
	LlmPromptMessage,
	MemoryItem,
} from './types';
import { DEFAULT_MEMORY_POLICY_REMINDER, formatMessage, summarizeText } from './helpers';

export interface PromptBuilderInput {
	systemInstructions: string;
	relevantMemories: MemoryItem[];
	session: AgentSession;
	userInput: string;
	memoryPolicyReminder?: string;
	maxHistoryMessages?: number;
}

export class PromptBuilder {
	build(input: PromptBuilderInput): BuiltPrompt {
		const historyMessages = input.session.shortTermMemory.messages.slice(
			-(input.maxHistoryMessages ?? 12)
		);
		const memorySection = this.formatMemorySection(input.relevantMemories);
		const historySection = this.formatHistorySection(input.session, historyMessages);
		const policyReminder = input.memoryPolicyReminder ?? DEFAULT_MEMORY_POLICY_REMINDER;
		const system = [
			'<SystemInstructions>',
			input.systemInstructions.trim(),
			'</SystemInstructions>',
			'<MemoryPolicyReminder>',
			policyReminder,
			'</MemoryPolicyReminder>',
			'<RelevantPersistentMemory>',
			'Persistent memory below may be stale or imperfect. Use it only when it helps answer the current user.',
			memorySection,
			'</RelevantPersistentMemory>',
			'<CurrentSessionHistory>',
			historySection,
			'</CurrentSessionHistory>',
		].join('\n');
		const messages = [
			...historyMessages
				.filter(
					(message): message is AgentMessage & { role: 'user' | 'assistant' } =>
						message.role === 'user' || message.role === 'assistant'
				)
				.map<LlmPromptMessage>((message) => ({ role: message.role, content: message.content })),
			{ role: 'user' as const, content: input.userInput },
		];
		const renderedPrompt = [
			system,
			'<CurrentUserInput>',
			input.userInput,
			'</CurrentUserInput>',
		].join('\n');

		return {
			system,
			messages,
			renderedPrompt,
			relevantMemoryIds: input.relevantMemories.map((memory) => memory.id),
		};
	}

	private formatMemorySection(memories: MemoryItem[]): string {
		if (memories.length === 0) return 'No relevant persistent memory selected.';
		return memories
			.map(
				(memory) =>
					`- (${memory.id}) ${memory.kind}; importance=${memory.importance}; confidence=${memory.confidence.toFixed(
						2
					)}; updated=${memory.updatedAt}: ${memory.summary}`
			)
			.join('\n');
	}

	private formatHistorySection(session: AgentSession, messages: AgentMessage[]): string {
		const parts: string[] = [];
		if (session.shortTermMemory.summary) {
			parts.push(`Session summary: ${session.shortTermMemory.summary}`);
		}
		if (session.workingMemory?.notes.length) {
			parts.push(
				`Session-only notes: ${session.workingMemory.notes.map((note) => summarizeText(note, 180)).join(' | ')}`
			);
		}
		if (messages.length === 0) {
			parts.push('No prior messages in this session.');
		} else {
			parts.push(...messages.map(formatMessage));
		}
		return parts.join('\n');
	}
}
