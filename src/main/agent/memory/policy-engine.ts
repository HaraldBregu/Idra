import type { Clock, MemoryItem, MemoryPrivacyLevel, MemoryUpdateDecision } from './types';
import {
	addDays,
	clampConfidence,
	IMPORTANCE_RANK,
	PRIVACY_RANK,
	summarizeText,
	toDecision,
	unique,
} from './helpers';

export interface MemoryPolicyReviewContext {
	explicitUserRequest: boolean;
	sessionOnly?: boolean;
}

export interface SecretRedactionResult {
	content: string;
	foundSecret: boolean;
}

export class MemoryPolicy {
	constructor(
		private readonly options: {
			clock?: Clock;
			episodicTtlDays?: number;
		} = {}
	) {}

	reviewDecision(
		decision: MemoryUpdateDecision,
		context: MemoryPolicyReviewContext
	): MemoryUpdateDecision {
		if (decision.shouldDelete || decision.action === 'ignore') return decision;
		if (context.sessionOnly) {
			return toDecision('session_only', 'The user asked to keep this only in the current chat.', {
				candidateMemory: decision.candidateMemory,
				targetMemoryId: decision.targetMemoryId,
			});
		}

		const candidate = decision.candidateMemory;
		if (!candidate) return decision;

		const redaction = this.redactSecrets(candidate.content);
		if (redaction.foundSecret) {
			return toDecision(
				'ignore',
				'Rejected persistent storage because the content appears to contain a secret.',
				{
					redactedContent: redaction.content,
				}
			);
		}

		if (this.isTemporary(candidate.content) && !context.explicitUserRequest) {
			return toDecision(
				'ignore',
				'Ignored one-time or temporary context that is not useful long term.',
				{
					candidateMemory: candidate,
				}
			);
		}

		const privacyLevel = this.inferPrivacyLevel(redaction.content);

		const reviewedCandidate = this.applyRetentionDefaults({
			...candidate,
			content: redaction.content,
			summary: summarizeText(redaction.content),
			privacyLevel,
		});

		return {
			...decision,
			candidateMemory: reviewedCandidate,
			patch:
				decision.action === 'update'
					? {
							...(decision.patch ?? {}),
							...this.toPatch(reviewedCandidate),
							metadata: {
								...(decision.patch?.metadata ?? {}),
								...reviewedCandidate.metadata,
							},
						}
					: decision.patch,
			redactedContent:
				redaction.content !== candidate.content ? redaction.content : decision.redactedContent,
		};
	}

	mergeMemory(existing: MemoryItem, incoming: MemoryItem): Partial<MemoryItem> {
		const strongestPrivacy =
			PRIVACY_RANK[incoming.privacyLevel] > PRIVACY_RANK[existing.privacyLevel]
				? incoming.privacyLevel
				: existing.privacyLevel;
		const strongestImportance =
			IMPORTANCE_RANK[incoming.importance] > IMPORTANCE_RANK[existing.importance]
				? incoming.importance
				: existing.importance;

		return {
			kind: incoming.kind,
			content: incoming.content,
			summary: incoming.summary,
			tags: unique([...existing.tags, ...incoming.tags]),
			importance: strongestImportance,
			confidence: clampConfidence(Math.max(existing.confidence, incoming.confidence) * 0.98),
			privacyLevel: strongestPrivacy,
			source: incoming.source,
			expiresAt: incoming.expiresAt,
			metadata: {
				...existing.metadata,
				...incoming.metadata,
				correctedAt: this.clock().toISOString(),
				previousContent: existing.content,
			},
		};
	}

	redactSecrets(content: string): SecretRedactionResult {
		let foundSecret = false;
		let redacted = content;
		const replacements: Array<[RegExp, (match: string) => string]> = [
			[
				/\b(password|passcode|api[_ -]?key|secret|token)\b\s*(?:is|=|:)\s*([^\s,;]+)/gi,
				(match) => {
					foundSecret = true;
					const label = match.split(/\s*(?:is|=|:)\s*/)[0] ?? 'secret';
					return `${label}: [REDACTED_SECRET]`;
				},
			],
			[
				/\bBearer\s+[A-Za-z0-9._-]{20,}\b/g,
				() => {
					foundSecret = true;
					return 'Bearer [REDACTED_SECRET]';
				},
			],
			[
				/\bsk-[A-Za-z0-9_-]{16,}\b/g,
				() => {
					foundSecret = true;
					return '[REDACTED_SECRET]';
				},
			],
		];

		for (const [pattern, replace] of replacements) {
			redacted = redacted.replace(pattern, replace);
		}

		return { content: redacted, foundSecret };
	}

	inferPrivacyLevel(content: string): MemoryPrivacyLevel {
		const lower = content.toLowerCase();
		if (
			/\b(medical|diagnosis|diagnosed|medication|religion|religious|political|sexual|biometric|fingerprint|ssn|social security)\b/.test(
				lower
			)
		) {
			return 'sensitive';
		}
		if (/\b(email|phone|address|passport|legal name|date of birth|dob)\b/.test(lower)) {
			return 'private';
		}
		if (/\b(i prefer|my preference|my project|i work|my workflow|my default|i use)\b/.test(lower)) {
			return 'personal';
		}
		return 'personal';
	}

	private applyRetentionDefaults(item: MemoryItem): MemoryItem {
		if (item.expiresAt || item.kind !== 'episodic') return item;
		const ttlDays = this.options.episodicTtlDays ?? 180;
		return {
			...item,
			expiresAt: addDays(this.clock(), ttlDays),
		};
	}

	private toPatch(item: MemoryItem): Partial<MemoryItem> {
		return {
			kind: item.kind,
			content: item.content,
			summary: item.summary,
			tags: item.tags,
			importance: item.importance,
			confidence: item.confidence,
			privacyLevel: item.privacyLevel,
			source: item.source,
			expiresAt: item.expiresAt,
			metadata: item.metadata,
		};
	}

	private isTemporary(content: string): boolean {
		return /\b(this time|just now|today only|for today|tomorrow only|one[- ]time|temporary|temporarily|for this chat|only for this chat)\b/i.test(
			content
		);
	}

	private clock(): Date {
		return (this.options.clock ?? (() => new Date()))();
	}
}
