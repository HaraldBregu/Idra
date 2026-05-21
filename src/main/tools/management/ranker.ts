import { schemaProperties } from './schema';
import { TOOL_SAFETY_ORDER, type RankedTool, type RelevantMemory, type SessionContext, type Tool, type ToolCategory } from './types';
import { tokenize } from './registry';

export interface ToolRankInput {
	userIntent: string;
	sessionContext: SessionContext;
	memory?: RelevantMemory;
	tools: Tool[];
}

export class ToolRanker {
	rank(input: ToolRankInput): RankedTool[] {
		const terms = tokenize(input.userIntent);
		const categories = inferCategories(input.userIntent, input.memory);
		return input.tools
			.map((tool) => rankTool(tool, terms, categories, input.memory))
			.sort((a, b) => b.score - a.score || b.tool.reliabilityScore - a.tool.reliabilityScore);
	}
}

function rankTool(tool: Tool, terms: string[], categories: Set<ToolCategory>, memory?: RelevantMemory): RankedTool {
	let score = 0;
	const explanations: string[] = [];
	const text = [tool.id, tool.name, tool.description, tool.category, ...tool.tags].join(' ').toLowerCase();
	const matchedTerms = terms.filter((term) => text.includes(term));
	if (matchedTerms.length > 0) {
		const gain = matchedTerms.length * 10;
		score += gain;
		explanations.push(`matched intent terms: ${matchedTerms.join(', ')}`);
	}
	if (categories.has(tool.category)) {
		score += 30;
		explanations.push(`matched category: ${tool.category}`);
	}
	if (memory?.preferredTools?.includes(tool.id)) {
		score += 12;
		explanations.push('matches user preferred tool');
	}
	if (memory?.preferredCategories?.includes(tool.category)) {
		score += 8;
		explanations.push('matches user preferred category');
	}
	if (memory?.recentlySuccessfulToolIds?.includes(tool.id)) {
		score += 6;
		explanations.push('recently succeeded in this workflow');
	}
	const requiredFieldCount = Object.keys(schemaProperties(tool.inputSchema)).length;
	if (requiredFieldCount <= 3) {
		score += 4;
		explanations.push('specific input schema');
	}
	if (tool.metadata.authoritative || tool.metadata.primarySource) {
		score += 10;
		explanations.push('authoritative source');
	}
	score += tool.reliabilityScore * 20;
	if (tool.reliabilityScore >= 0.9) explanations.push('high reliability');
	score += Math.max(0, 10 - costPenalty(tool));
	score += Math.max(0, 10 - latencyPenalty(tool));
	score -= TOOL_SAFETY_ORDER[tool.safetyLevel] * 2;
	if (tool.category === 'search' && !categories.has('search') && categories.size > 0) {
		score -= 8;
		explanations.push('generic search is lower priority than specialized tools');
	}
	return { tool, score, explanations };
}

function costPenalty(tool: Tool): number {
	const tierPenalty = { free: 0, low: 2, medium: 5, high: 9 }[tool.costEstimate.tier];
	return tierPenalty + Math.min(6, tool.costEstimate.amount);
}

function latencyPenalty(tool: Tool): number {
	return Math.min(10, tool.latencyEstimate.p95Ms / 1000);
}

export function inferCategories(userIntent: string, memory?: RelevantMemory): Set<ToolCategory> {
	const text = userIntent.toLowerCase();
	const categories = new Set<ToolCategory>(memory?.preferredCategories ?? []);
	if (/\b(weather|forecast|temperature|rain|snow)\b/.test(text)) categories.add('web');
	if (/\b(calculate|calculator|math|sum|average|percent|equation)\b/.test(text)) categories.add('calculator');
	if (/\b(file|folder|directory|read|write|edit|delete|copy|move|rename|inspect|binary|image|find in repo|search files)\b/.test(text)) categories.add('files');
	if (/\b(generate|create|edit|vary|variation)\b.*\b(image|picture|photo|illustration)\b/.test(text)) categories.add('image');
	if (/\b(google drive|my drive|shared drive|drive files?|drive documents?|drive folder|drive folders)\b/.test(text)) categories.add('files');
	if (/\b(startup|bootstrap|identity|persona|soul|preferences)\b/.test(text)) categories.add('files');
	if (/\b(email|mail|inbox|draft|send)\b/.test(text)) categories.add('email');
	if (/\b(calendar|agenda|availability|available|free|busy|meeting|schedule|event|appointment)\b/.test(text)) categories.add('calendar');
	if (/\b(database|sql|query|record)\b/.test(text)) categories.add('database');
	if (/\b(background tasks?|tasks?|task manager)\b/.test(text)) categories.add('internalApi');
	if (/\b(run|execute|script|test|build|terminal|shell)\b/.test(text)) categories.add('codeExecution');
	if (/\b(memory|remember|preference|recall)\b/.test(text)) categories.add('memory');
	if (/\b(search|current|latest|today|news|look up|web)\b/.test(text)) categories.add('search');
	if (/\b(browser|navigate|screenshot|webpage|web page|visit|automation|click|fill|interact)\b/.test(text)) categories.add('web');
	return categories;
}
