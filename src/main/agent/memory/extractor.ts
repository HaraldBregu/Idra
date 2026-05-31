import type { Clock, IdGenerator, MemoryItem, MemoryKind, MemoryUpdateDecision, UserMemory } from './types';
import { CryptoIdGenerator } from './types';
import { isArchived, isExpired, keywordScore, memorySearchText, nowIso, stripCommandContent, summarizeText, toDecision, tokenize, unique } from './helpers';
import { MemoryPolicy } from './policy-engine';

export interface MemoryExtractionInput {
	userId: string;
	userMessage: string;
	agentReply: string;
	sessionId: string;
	existingMemory: UserMemory;
}

export class MemoryExtractor {
	constructor(
		private readonly policy: MemoryPolicy,
		private readonly idGenerator: IdGenerator = new CryptoIdGenerator(),
		private readonly clock: Clock = () => new Date()
	) {}

	extract(input: MemoryExtractionInput): MemoryUpdateDecision[] {
		const text = input.userMessage.trim();
		if (!text) return [];

		const decisions: MemoryUpdateDecision[] = [];
		const sessionOnly = this.isSessionOnlyRequest(text);
		const forgetDecision = this.extractForgetDecision(input);
		if (forgetDecision) return [forgetDecision];

		const candidate = this.extractCandidate(input, sessionOnly);
		if (candidate) {
			const updateTarget = this.findUpdateTarget(candidate, input.existingMemory, this.isCorrection(text));
			const rawDecision = updateTarget
				? toDecision('update', 'Updated an existing memory instead of creating a conflicting duplicate.', {
						candidateMemory: candidate,
						targetMemoryId: updateTarget.id,
						patch: this.policy.mergeMemory(updateTarget, candidate),
					})
				: toDecision('store', 'Stored useful long-term context for future conversations.', {
						candidateMemory: candidate,
					});

			decisions.push(
				this.policy.reviewDecision(rawDecision, {
					explicitUserRequest: this.isExplicitRememberRequest(text),
					sessionOnly,
				})
			);
		} else if (sessionOnly) {
			decisions.push(toDecision('session_only', 'The user asked not to persist this outside the current chat.'));
		}

		if (decisions.length === 0) {
			decisions.push(toDecision('ignore', 'No durable memory candidate was found.'));
		}

		return decisions;
	}

	private extractForgetDecision(input: MemoryExtractionInput): MemoryUpdateDecision | undefined {
		const forgetMatch = input.userMessage.match(/\bforget(?:\s+(?:that|about|my))?\s*:?\s+(.+)$/i);
		if (!forgetMatch?.[1]) return undefined;

		const targetText = stripCommandContent(forgetMatch[1]);
		const target = this.findBestExistingMemory(targetText, input.existingMemory.longTerm.items);
		if (!target) {
			return toDecision('ignore', `No matching memory found to forget: ${targetText}`);
		}

		return toDecision('delete', `Deleted memory matching user forget request: ${targetText}`, {
			targetMemoryId: target.id,
		});
	}

	private extractCandidate(input: MemoryExtractionInput, sessionOnly: boolean): MemoryItem | undefined {
		const message = input.userMessage.trim();
		const explicitRemember = message.match(/\bremember(?:\s+(?:that|this))?\s*:?\s+(.+)$/i);
		if (explicitRemember?.[1]) {
			const content = stripCommandContent(
				sessionOnly
					? explicitRemember[1].replace(/^(?:only for this chat|for this chat)\s*:?\s*/i, '')
					: explicitRemember[1]
			);
			if (!content) return undefined;
			return this.createCandidate(input.userId, input.sessionId, content, true, sessionOnly);
		}

		if (this.isCorrection(message)) {
			const content = stripCommandContent(
				message
					.replace(/\b(that.?s wrong|that is wrong|correction|actually|no,?)\b[:\s,]*/i, '')
					.trim()
			);
			if (content && this.looksDurable(content)) {
				return this.createCandidate(input.userId, input.sessionId, content, false, false);
			}
		}

		if (this.looksDurable(message)) {
			return this.createCandidate(input.userId, input.sessionId, message, false, false);
		}

		return undefined;
	}

	private createCandidate(
		userId: string,
		sessionId: string,
		content: string,
		explicit: boolean,
		sessionOnly: boolean
	): MemoryItem {
		const now = nowIso(this.clock);
		const kind = this.inferKind(content);
		const tags = unique([kind, ...this.inferDomainTags(content), ...tokenize(content).slice(0, 8)]);
		return {
			id: this.idGenerator.createId('mem'),
			userId,
			kind,
			content,
			summary: summarizeText(content),
			tags,
			importance: explicit || kind === 'preference' || kind === 'workflow_instruction' ? 'high' : 'medium',
			confidence: explicit ? 0.95 : 0.72,
			privacyLevel: 'personal',
			source: {
				type: explicit ? 'user_explicit' : 'user_implicit',
				sessionId,
				evidence: content,
			},
			createdAt: now,
			updatedAt: now,
			lastAccessedAt: now,
			metadata: {
				extractor: 'heuristic-v1',
				explicit,
				sessionOnly,
			},
		};
	}

	private inferKind(content: string): MemoryKind {
		const lower = content.toLowerCase();
		if (/\b(prefer|preference|like|dislike|favorite|default)\b/.test(lower)) return 'preference';
		if (/\b(always|usually|workflow|process|review|test|strict typing|examples)\b/.test(lower)) return 'workflow_instruction';
		if (/\b(project|repo|codebase|stack|architecture|client)\b/.test(lower)) return 'project_context';
		if (/\b(last time|yesterday|meeting|call|interaction|session)\b/.test(lower)) return 'episodic';
		return 'semantic';
	}

	private inferDomainTags(content: string): string[] {
		const lower = content.toLowerCase();
		const tags: string[] = [];
		if (/\b(typescript|javascript|python|code|function|strict typing|examples?)\b/.test(lower)) {
			tags.push('code', 'programming');
		}
		if (/\b(concise|brief|detailed|step[- ]by[- ]step|answers?|explanations?)\b/.test(lower)) {
			tags.push('response_style');
		}
		if (/\b(test|tests|testing|jest|vitest|unit test)\b/.test(lower)) {
			tags.push('testing', 'code');
		}
		return tags;
	}

	private looksDurable(content: string): boolean {
		const lower = content.toLowerCase();
		if (/\b(do not remember|don't remember|dont remember|only for this chat|for this chat)\b/.test(lower)) return false;
		return /\b(i prefer|my preference|i like|i dislike|please always|always use|i usually|my default|my project|i work on|my workflow|my stack|i use)\b/.test(
			lower
		);
	}

	private isExplicitRememberRequest(content: string): boolean {
		return /\bremember\b/i.test(content);
	}

	private isSessionOnlyRequest(content: string): boolean {
		return /\b(remember this only for this chat|only for this chat|do not remember this|don't remember this|dont remember this)\b/i.test(
			content
		);
	}

	private isCorrection(content: string): boolean {
		return /\b(that.?s wrong|that is wrong|actually|correction|no,)\b/i.test(content);
	}

	private findUpdateTarget(candidate: MemoryItem, memory: UserMemory, forceCorrection: boolean): MemoryItem | undefined {
		const active = memory.longTerm.items.filter((item) => !isArchived(item) && !isExpired(item, this.clock));
		const sameKind = active.filter((item) => item.kind === candidate.kind);
		const pool = sameKind.length > 0 ? sameKind : active;
		const best = this.findBestExistingMemory(candidate.content, pool);
		if (best && keywordScore(candidate.content, memorySearchText(best)) >= 0.15) return best;
		if (forceCorrection && sameKind.length === 1) return sameKind[0];
		return undefined;
	}

	private findBestExistingMemory(query: string, items: MemoryItem[]): MemoryItem | undefined {
		let best: { item: MemoryItem; score: number } | undefined;
		for (const item of items) {
			if (isArchived(item) || isExpired(item, this.clock)) continue;
			const score = keywordScore(query, memorySearchText(item));
			if (!best || score > best.score) {
				best = { item, score };
			}
		}
		return best && best.score > 0 ? best.item : undefined;
	}
}
