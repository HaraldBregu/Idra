import {
	AGENTS,
	EMBEDDING_AGENT_ID,
	LLM_AGENT_ID,
	RESEARCH_CHAT_AGENT_ID,
	TEXT_TO_IMAGE_AGENT_ID,
} from '../../../../src/shared/agents';
import {
	isAgentCapabilityServiceKind,
	isAgentRunStopReason,
	isAgentToolResultStatus,
} from '../../../../src/shared/agents/constants';
import {
	getModelReasoningEfforts,
	isAllowedSpeechToTextModel,
	MODEL_REASONING_EFFORTS,
} from '../../../../src/shared/agents/service';

describe('shared agent contracts', () => {
	it('keeps semantic agent ids independent of provider capability array order', () => {
		expect(LLM_AGENT_ID).toBe('llm');
		expect(RESEARCH_CHAT_AGENT_ID).toBe('research-chat');
		expect(TEXT_TO_IMAGE_AGENT_ID).toBe('text-to-image');
		expect(EMBEDDING_AGENT_ID).toBe('embedding');
		expect(AGENTS.llm).toBe(LLM_AGENT_ID);
	});

	it('validates stream status and service-kind values at runtime boundaries', () => {
		expect(isAgentCapabilityServiceKind('mcp')).toBe(true);
		expect(isAgentCapabilityServiceKind('database')).toBe(false);
		expect(isAgentToolResultStatus('blocked')).toBe(true);
		expect(isAgentToolResultStatus('timeout')).toBe(false);
		expect(isAgentRunStopReason('max_iterations')).toBe(true);
		expect(isAgentRunStopReason('rate_limited')).toBe(false);
	});

	it('preserves service barrel exports for model service helpers', () => {
		expect(getModelReasoningEfforts('gpt-5.5', 'openai')).toEqual(MODEL_REASONING_EFFORTS);
		expect(isAllowedSpeechToTextModel('openai', 'gpt-4o-transcribe')).toBe(true);
	});
});
