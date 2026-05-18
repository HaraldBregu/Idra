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
		if (isToolIntrospectionRequest(request)) {
			return { shouldUseTools: true, reason: 'user is asking about available tools' };
		}
		// Any message containing a URL requires tool use (open, fetch, screenshot, etc.)
		if (/https?:\/\/\S+/.test(input.userRequest)) {
			return { shouldUseTools: true, reason: 'request contains a URL' };
		}
		if (/\b(write|draft|compose|create)\b.*\b(poem|story|essay|paragraph|creative)\b/.test(request)) {
			return { shouldUseTools: false, reason: 'request can be handled from provided context or general reasoning' };
		}
		if (/\b(write|rewrite|translate|summarize|brainstorm|poem|story|creative)\b/.test(request) && !needsExternalAccess(request)) {
			return { shouldUseTools: false, reason: 'request can be handled from provided context or general reasoning' };
		}
		if (needsExternalAccess(request)) {
			return { shouldUseTools: true, reason: 'request depends on external, private, current, or mutable data' };
		}
		if (/\b(calculate|compute|math|run tests?|build|execute|run|script|python|terminal|shell)\b/.test(request)) {
			return { shouldUseTools: true, reason: 'request benefits from reliable computation or execution' };
		}
		if (input.modelUncertainty) {
			return { shouldUseTools: true, reason: 'model uncertainty requires verification' };
		}
		return { shouldUseTools: false, reason: 'no tool is required to answer safely' };
	}
}

export function isToolIntrospectionRequest(request: string): boolean {
	return /\b(what|which|list|show|tell me|do you|can you)\b.*\b(tools?|capabilities|functions?|actions?)\b/.test(request);
}

function needsExternalAccess(request: string): boolean {
	if (/\b(gmail|google calendar|google account|google profile|inbox)\b/.test(request)) {
		return true;
	}
	if (/\b(calendar|agenda|availability|available|free|busy|meetings?|events?|appointments?)\b/.test(request)) {
		return true;
	}
	if (/\b(get|fetch|read|show|check|list)\b.*\b(profile|account|messages?|emails?)\b/.test(request)) {
		return true;
	}
	if (/\b(browser|navigate|screenshot|visit|open (url|link|page|site|tab)|go to|launch browser)\b/.test(request)) {
		return true;
	}
	return /\b(current|latest|today|now|weather|news|look up|search|file|folder|directory|workspace|startup|bootstrap|identity|persona|document|codebase|email|calendar|database|api|send|delete|copy|move|rename|inspect|binary|image|purchase|post|schedule|create|edit|write|read|modify|change|fix|debug|test|build|implement|refactor|private|repo)\b/.test(
		request
	);
}
