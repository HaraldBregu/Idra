import { ToolPromptBuilder } from './prompting';
import { ToolUsePolicy } from './use-policy';
import type { LLMProvider, RankedTool, RelevantMemory, SessionContext, ToolSelectionDecision } from './types';

export interface ToolSelectorInput {
	userRequest: string;
	rankedTools: RankedTool[];
	sessionContext: SessionContext;
	memory?: RelevantMemory;
	modelUncertainty?: boolean;
}

export class ToolSelector {
	constructor(
		private readonly policy = new ToolUsePolicy(),
		private readonly promptBuilder = new ToolPromptBuilder(),
		private readonly llm?: LLMProvider
	) {}

	async select(input: ToolSelectorInput): Promise<ToolSelectionDecision> {
		const safety = refuseUnsafe(input.userRequest);
		if (safety) return safety;
		const policy = this.policy.evaluate({
			userRequest: input.userRequest,
			modelUncertainty: input.modelUncertainty,
		});
		if (!policy.shouldUseTools) return { type: 'answerWithoutTool', reason: policy.reason };
		if (input.rankedTools.length === 0) {
			return {
				type: 'askClarifyingQuestion',
				question: 'I need either permission to use an appropriate tool or more context to continue.',
				reason: 'no permitted candidate tools were available',
			};
		}
		const llmDecision = this.llm ? await this.tryLlmDecision(input) : undefined;
		if (llmDecision) return llmDecision;
		const top = input.rankedTools[0]!;
		const second = input.rankedTools[1];
		if (second && shouldUseBoth(input.userRequest, top, second)) {
			return {
				type: 'useMultipleTools',
				toolIds: [top.tool.id, second.tool.id],
				reason: `two independent capabilities are needed: ${top.tool.category} and ${second.tool.category}`,
			};
		}
		return { type: 'useTool', toolId: top.tool.id, reason: top.explanations.join('; ') || policy.reason };
	}

	private async tryLlmDecision(input: ToolSelectorInput): Promise<ToolSelectionDecision | undefined> {
		if (!this.llm) return undefined;
		const prompt = [
			this.promptBuilder.buildCompactPrompt(input.rankedTools),
			'Return JSON only: {"type":"useTool","toolId":"...","reason":"..."} or {"type":"answerWithoutTool","reason":"..."} or {"type":"askClarifyingQuestion","question":"...","reason":"..."}.',
			`User request: ${input.userRequest}`,
		].join('\n\n');
		try {
			const raw = await this.llm.complete({ system: 'Choose the minimal safe tool plan.', prompt, maxTokens: 300, temperature: 0 });
			const parsed = JSON.parse(raw) as Partial<ToolSelectionDecision>;
			if (parsed.type === 'useTool' && typeof parsed.toolId === 'string') {
				return { type: 'useTool', toolId: parsed.toolId, reason: String(parsed.reason ?? 'llm selected tool') };
			}
			if (parsed.type === 'answerWithoutTool') return { type: 'answerWithoutTool', reason: String(parsed.reason ?? 'llm selected no tool') };
			if (parsed.type === 'askClarifyingQuestion') {
				return {
					type: 'askClarifyingQuestion',
					question: String(parsed.question ?? 'Can you clarify what you want me to do?'),
					reason: String(parsed.reason ?? 'llm requested clarification'),
				};
			}
		} catch {
			return undefined;
		}
		return undefined;
	}
}

function shouldUseBoth(userRequest: string, top: RankedTool, second: RankedTool): boolean {
	if (top.tool.category === second.tool.category) return false;
	return /\b(and then|then|also|compare|cross-check|verify)\b/i.test(userRequest) && second.score >= top.score * 0.7;
}

function refuseUnsafe(userRequest: string): ToolSelectionDecision | undefined {
	if (/\b(steal|exfiltrate|credential theft|malware|ransomware|make a bomb)\b/i.test(userRequest)) {
		return { type: 'refuseForSafety', reason: 'request crosses a safety boundary' };
	}
	return undefined;
}

