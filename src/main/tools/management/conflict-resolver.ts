import type { RankedTool, ToolResult } from './types';

export type ToolConflictResolution<TOutput = unknown> =
	| { type: 'useResult'; result: ToolResult<TOutput>; reason: string }
	| { type: 'fallbackTool'; toolId: string; reason: string }
	| { type: 'askUser'; question: string; reason: string }
	| { type: 'citeUncertainty'; results: Array<ToolResult<TOutput>>; reason: string };

export interface ToolConflictCandidate<TOutput = unknown> {
	rankedTool: RankedTool;
	result: ToolResult<TOutput>;
	fallbackToolIds?: string[];
}

export class ToolConflictResolver {
	resolve<TOutput>(candidates: Array<ToolConflictCandidate<TOutput>>): ToolConflictResolution<TOutput> {
		const successful = candidates.filter((candidate) => candidate.result.success);
		if (successful.length === 0) {
			const fallbackToolId = candidates.flatMap((candidate) => candidate.fallbackToolIds ?? [])[0];
			if (fallbackToolId) return { type: 'fallbackTool', toolId: fallbackToolId, reason: 'all candidate tools failed' };
			return {
				type: 'askUser',
				question: 'The available tools failed. Should I try a different source or proceed with the uncertainty?',
				reason: 'no successful tool result or fallback is available',
			};
		}

		const sorted = [...successful].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
		const best = sorted[0]!;
		const conflicting = sorted
			.slice(1)
			.filter((candidate) => conflicts(best.result.data, candidate.result.data))
			.filter((candidate) => scoreCandidate(candidate) >= scoreCandidate(best) - 5);
		if (conflicting.length > 0) {
			return {
				type: 'citeUncertainty',
				results: [best.result, ...conflicting.map((candidate) => candidate.result)],
				reason: 'similarly credible tools returned conflicting data',
			};
		}
		return {
			type: 'useResult',
			result: best.result,
			reason: best.rankedTool.explanations.join('; ') || 'preferred authoritative, specific, recent, reliable result',
		};
	}
}

function scoreCandidate(candidate: ToolConflictCandidate): number {
	const tool = candidate.rankedTool.tool;
	let score = candidate.rankedTool.score;
	if (tool.metadata.primarySource || tool.metadata.authoritative) score += 30;
	if (tool.category !== 'search') score += 8;
	score += tool.reliabilityScore * 10;
	const fetchedAt = candidate.result.metadata.fetchedAt;
	if (typeof fetchedAt === 'string') {
		const ageMs = Date.now() - Date.parse(fetchedAt);
		if (Number.isFinite(ageMs)) score += Math.max(0, 10 - ageMs / 86_400_000);
	}
	if (candidate.result.metadata.outputStatus === 'stale') score -= 12;
	if (candidate.result.metadata.outputStatus === 'partial') score -= 8;
	return score;
}

function conflicts(left: unknown, right: unknown): boolean {
	if (left === undefined || right === undefined) return false;
	if (JSON.stringify(left) === JSON.stringify(right)) return false;
	if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) return true;
	const leftRecord = left as Record<string, unknown>;
	const rightRecord = right as Record<string, unknown>;
	const commonKeys = Object.keys(leftRecord).filter((key) => Object.prototype.hasOwnProperty.call(rightRecord, key));
	if (commonKeys.length === 0) return false;
	return commonKeys.some((key) => JSON.stringify(leftRecord[key]) !== JSON.stringify(rightRecord[key]));
}

