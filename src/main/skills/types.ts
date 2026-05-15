import type { JSONSchema } from '../provider/types';
import type { AgentTool, AgentToolResult } from '../tools/types';
import type {
	SkillCategory,
	SkillDependencyManifest,
	SkillExampleManifest,
	SkillSafetyLevel,
	SkillVisibility,
} from '../../shared/skills';

export type JsonSchema = JSONSchema;
export type SkillPermission = string;
export type SkillMemoryKind = string;

export interface SkillCostEstimate {
	amount: number;
	unit: 'abstract' | 'toolCalls' | 'tokens' | 'usd';
}

export interface SkillLatencyEstimate {
	p50Ms: number;
	p95Ms?: number;
}

export interface SkillContract {
	inputs: JsonSchema;
	outputs: JsonSchema;
	sideEffects: string[];
	permissionsRequired: SkillPermission[];
	allowedTools: string[];
	allowedConnectors: string[];
	memoryAccess: SkillMemoryRule[];
	failureBehavior: string[];
	requiresConfirmation?: boolean;
}

export interface SkillMemoryRule {
	kind: SkillMemoryKind;
	access: 'read' | 'write' | 'readWrite';
	purpose: string;
}

export interface SkillCapabilityResult {
	canHandle: boolean;
	confidence: number;
	reasons: string[];
	requiredClarifications?: string[];
	warnings?: string[];
}

export interface SkillContext {
	userId: string;
	sessionId: string;
	intent: string;
	availableTools: ReadonlySet<string>;
	availableConnectors: ReadonlySet<string>;
	permissions: ReadonlySet<SkillPermission>;
	availableMemoryKinds: ReadonlySet<SkillMemoryKind>;
	userPreferences: SkillUserPreferences;
	priorSuccessRate: ReadonlyMap<string, number>;
	now: Date;
	parentSkillId?: string;
	skillDepth: number;
	provenanceChain: SkillProvenance[];
}

export interface Skill<TInput = unknown, TOutput = unknown> {
	id: string;
	name: string;
	description: string;
	version: string;
	inputSchema: JsonSchema;
	outputSchema: JsonSchema;
	canHandle(context: SkillContext): Promise<SkillCapabilityResult>;
	execute(input: TInput, context: SkillExecutionContext): Promise<SkillResult<TOutput>>;
}

export interface SkillDefinition<TInput = unknown, TOutput = unknown>
	extends Skill<TInput, TOutput> {
	category: SkillCategory;
	tags: string[];
	author: string;
	enabled: boolean;
	visibility: SkillVisibility;
	safetyLevel: SkillSafetyLevel;
	permissionsRequired: SkillPermission[];
	requiredTools: string[];
	requiredConnectors: string[];
	requiredMemoryKinds: SkillMemoryKind[];
	estimatedCost: SkillCostEstimate;
	estimatedLatency: SkillLatencyEstimate;
	reliabilityScore: number;
	examples: SkillExampleManifest[];
	metadata: Record<string, unknown>;
	contract: SkillContract;
	dependencies: SkillDependencyManifest[];
	deprecated?: boolean;
	trusted?: boolean;
	loadedFrom?: string;
}

export interface SkillConnector {
	id: string;
	name: string;
	tools: ReadonlySet<string>;
	call(toolName: string, args: unknown): Promise<unknown>;
}

export interface SkillMemoryRead {
	kind: SkillMemoryKind;
	id?: string;
	summary: string;
	value?: unknown;
}

export interface SkillMemoryWrite {
	kind: SkillMemoryKind;
	summary: string;
	value: unknown;
	sensitive?: boolean;
}

export interface SkillMemoryWriteDecision {
	allowed: boolean;
	reason?: string;
	committed?: boolean;
}

export interface MemoryRetriever {
	read(kind: SkillMemoryKind, query: string): Promise<SkillMemoryRead[]>;
	getPreferences(userId: string): Promise<SkillUserPreferences>;
}

export interface MemoryPolicy {
	canRead(kind: SkillMemoryKind, context: SkillExecutionContext): boolean;
	evaluateWrite(
		write: SkillMemoryWrite,
		context: SkillExecutionContext
	): Promise<SkillMemoryWriteDecision>;
	commitWrite?(
		write: SkillMemoryWrite,
		context: SkillExecutionContext
	): Promise<SkillMemoryWriteDecision>;
}

export interface SkillUserPreferences {
	preferredSkills: string[];
	avoidedSkills: string[];
	preferredWorkflowStyles: string[];
	preferredOutputFormats: string[];
	preferredAutomationLevel?: 'manual' | 'draftBeforeAction' | 'automatic';
	metadata: Record<string, unknown>;
}

export interface SkillLogger {
	debug(scope: string, message: string, details?: unknown): void;
	info(scope: string, message: string, details?: unknown): void;
	warn(scope: string, message: string, details?: unknown): void;
	error(scope: string, message: string, details?: unknown): void;
}

export interface SkillSafetyCheck {
	allowed: boolean;
	reasons: string[];
	warnings: string[];
	requiresConfirmation?: boolean;
}

export interface SkillSafetyPolicyPort {
	checkBeforeExecution(
		skill: SkillDefinition,
		input: unknown,
		context: SkillExecutionRequestContext
	): Promise<SkillSafetyCheck>;
	checkToolUse(
		skill: SkillDefinition,
		toolName: string,
		args: unknown,
		context: SkillExecutionRequestContext
	): Promise<SkillSafetyCheck>;
	checkConnectorUse(
		skill: SkillDefinition,
		connectorId: string,
		toolName: string,
		args: unknown,
		context: SkillExecutionRequestContext
	): Promise<SkillSafetyCheck>;
}

export interface SkillExecutionPlan {
	id: string;
	goal: string;
	subgoals: string[];
	selectedSkills: SkillPlanSkillRef[];
	executionOrder: SkillPlanStep[];
	dependencies: SkillPlanDependency[];
	requiredPermissions: SkillPermission[];
	stopConditions: string[];
	fallbackPlans: SkillFallbackPlan[];
	estimatedCost: SkillCostEstimate;
	estimatedLatency: SkillLatencyEstimate;
	createdAt: string;
}

export interface SkillPlanSkillRef {
	skillId: string;
	version: string;
}

export interface SkillPlanStep {
	id: string;
	skillId: string;
	version: string;
	subgoal: string;
	dependsOn: string[];
	input?: unknown;
}

export interface SkillPlanDependency {
	fromStepId: string;
	toStepId: string;
	reason: string;
}

export interface SkillFallbackPlan {
	reason: string;
	steps: SkillPlanStep[];
}

export interface SkillProvenance {
	originatingSkillId: string;
	skillId: string;
	version: string;
	parentSkillId?: string;
	toolsUsed: string[];
	connectorsUsed: string[];
	memoryAccessed: string[];
	generatedArtifacts: string[];
	externalSources: string[];
	startedAt: string;
	finishedAt?: string;
}

export type SkillErrorCode =
	| 'cancelled'
	| 'connector_forbidden'
	| 'dependency_missing'
	| 'execution_failed'
	| 'input_invalid'
	| 'memory_policy_denied'
	| 'not_found'
	| 'output_invalid'
	| 'permission_denied'
	| 'recursion_blocked'
	| 'safety_denied'
	| 'timeout'
	| 'tool_forbidden'
	| 'unavailable';

export interface SkillError {
	code: SkillErrorCode;
	message: string;
	retryable?: boolean;
	details?: unknown;
}

export interface SkillResult<TOutput = unknown> {
	success: boolean;
	data?: TOutput;
	error?: SkillError;
	warnings: string[];
	provenance: SkillProvenance;
	usedSkills: string[];
	usedTools: string[];
	usedConnectors: string[];
	memoryReads: SkillMemoryRead[];
	memoryWrites: SkillMemoryWrite[];
	startedAt: string;
	finishedAt: string;
	durationMs: number;
	retryCount: number;
	metadata: Record<string, unknown>;
}

export interface SkillExecutionContext {
	userId: string;
	sessionId: string;
	memory: MemoryRetriever;
	allowedTools: ReadonlyMap<string, AgentTool>;
	allowedConnectors: ReadonlyMap<string, SkillConnector>;
	permissions: ReadonlySet<SkillPermission>;
	userPreferences: SkillUserPreferences;
	currentPlan?: SkillExecutionPlan;
	cancellationToken?: AbortSignal;
	logger: SkillLogger;
	safetyPolicy: SkillSafetyPolicyPort;
	skillDepth: number;
	parentSkillId?: string;
	provenanceChain: SkillProvenance[];
	callTool<TDetails = unknown>(
		name: string,
		args: Record<string, unknown>
	): Promise<AgentToolResult<TDetails>>;
	callConnector(connectorId: string, toolName: string, args: unknown): Promise<unknown>;
	executeSkill<TInput = unknown, TOutput = unknown>(
		skillId: string,
		input: TInput,
		options?: { version?: string }
	): Promise<SkillResult<TOutput>>;
	proposeMemoryWrite(write: SkillMemoryWrite): Promise<SkillMemoryWriteDecision>;
	complete<TOutput>(data: TOutput, metadata?: Record<string, unknown>): SkillResult<TOutput>;
	fail<TOutput = never>(
		error: SkillError,
		metadata?: Record<string, unknown>
	): SkillResult<TOutput>;
}

export interface SkillExecutionRequestContext {
	userId: string;
	sessionId: string;
	allowedTools: ReadonlyMap<string, AgentTool>;
	allowedConnectors: ReadonlyMap<string, SkillConnector>;
	permissions: ReadonlySet<SkillPermission>;
	memory: MemoryRetriever;
	memoryPolicy: MemoryPolicy;
	userPreferences: SkillUserPreferences;
	currentPlan?: SkillExecutionPlan;
	cancellationToken?: AbortSignal;
	logger: SkillLogger;
	safetyPolicy: SkillSafetyPolicyPort;
	skillDepth: number;
	parentSkillId?: string;
	provenanceChain: SkillProvenance[];
	toolContext: import('../tools/types').ToolContext;
	timeoutMs?: number;
	maxRetries?: number;
	maxDepth?: number;
}

export interface SkillExecutionRequest<TInput = unknown> {
	skillId: string;
	version?: string;
	input: TInput;
	context: SkillExecutionRequestContext;
}

export interface SkillRanking {
	skill: SkillDefinition;
	score: number;
	factors: Record<string, number>;
	reasons: string[];
}

export interface SkillDiscoveryCandidate {
	skill: SkillDefinition;
	capability: SkillCapabilityResult;
	ranking: SkillRanking;
}

export interface SkillDiscoveryResult {
	query: string;
	candidates: SkillDiscoveryCandidate[];
	filtered: Array<{ skillId: string; version: string; reason: string }>;
	totalAvailable: number;
	generatedAt: string;
}

export type SkillSelectionDecision =
	| { kind: 'useSkill'; skill: SkillDiscoveryCandidate; reason: string }
	| { kind: 'useMultipleSkills'; skills: SkillDiscoveryCandidate[]; reason: string }
	| { kind: 'answerDirectly'; reason: string }
	| { kind: 'askClarifyingQuestion'; question: string; candidates: SkillDiscoveryCandidate[] }
	| { kind: 'refuseSafely'; reason: string };

export interface SkillPromptChoice {
	id: string;
	version: string;
	name: string;
	description: string;
	category: SkillCategory;
	tags: string[];
	requiredTools: string[];
	requiredConnectors: string[];
	permissionsRequired: string[];
	safetyLevel: SkillSafetyLevel;
	score: number;
}

export function skillKey(skillId: string, version: string): string {
	return `${skillId}@${version}`;
}

export function emptyPreferences(): SkillUserPreferences {
	return {
		preferredSkills: [],
		avoidedSkills: [],
		preferredWorkflowStyles: [],
		preferredOutputFormats: [],
		metadata: {},
	};
}

export function createProvenance(
	skill: Pick<SkillDefinition, 'id' | 'version'>,
	parentSkillId: string | undefined,
	chain: SkillProvenance[],
	startedAt: string
): SkillProvenance {
	return {
		originatingSkillId: chain[0]?.originatingSkillId ?? skill.id,
		skillId: skill.id,
		version: skill.version,
		parentSkillId,
		toolsUsed: [],
		connectorsUsed: [],
		memoryAccessed: [],
		generatedArtifacts: [],
		externalSources: [],
		startedAt,
	};
}
