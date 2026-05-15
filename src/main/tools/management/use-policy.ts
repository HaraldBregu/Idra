export interface ToolUsePolicyInput {
	userRequest: string;
	modelUncertainty?: boolean;
	userExplicitlyDisabledTools?: boolean;
}

export type ToolUsePolicyDecision =
	| { shouldUseTools: true; reason: string }
	| { shouldUseTools: false; reason: string };

export class ToolUsePolicy {
	evaluate(input: ToolUsePolicyInput): ToolUsePolicyDecision {
		const request = input.userRequest.trim().toLowerCase();
		if (input.userExplicitlyDisabledTools || /\b(no tools|without tools|do not use tools|don't use tools)\b/.test(request)) {
			return { shouldUseTools: false, reason: 'user explicitly disabled tool use' };
		}
		if (/\b(write|draft|compose)\b.*\b(poem|story|essay|paragraph|creative)\b/.test(request)) {
			return { shouldUseTools: false, reason: 'request can be handled from provided context or general reasoning' };
		}
		if (/\b(write|rewrite|translate|summarize|brainstorm|poem|story|creative)\b/.test(request) && !needsExternalAccess(request)) {
			return { shouldUseTools: false, reason: 'request can be handled from provided context or general reasoning' };
		}
		if (needsExternalAccess(request)) {
			return { shouldUseTools: true, reason: 'request depends on external, private, current, or mutable data' };
		}
		if (/\b(calculate|compute|math|run tests|build|execute)\b/.test(request)) {
			return { shouldUseTools: true, reason: 'request benefits from reliable computation or execution' };
		}
		if (input.modelUncertainty) {
			return { shouldUseTools: true, reason: 'model uncertainty requires verification' };
		}
		return { shouldUseTools: false, reason: 'no tool is required to answer safely' };
	}
}

function needsExternalAccess(request: string): boolean {
	return /\b(current|latest|today|now|weather|news|look up|search|file|folder|email|calendar|database|api|send|delete|purchase|post|schedule|create|edit|write|read|private|repo)\b/.test(
		request
	);
}
