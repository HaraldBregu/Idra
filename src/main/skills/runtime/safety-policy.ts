import type {
	SkillDefinition,
	SkillExecutionRequestContext,
	SkillSafetyCheck,
	SkillSafetyPolicyPort,
} from '../core/types';

const INJECTION_PATTERN = /ignore (all )?(previous|system) instructions|developer message|reveal.*(prompt|secret)|bypass safety/i;

function denied(reason: string, warnings: string[] = []): SkillSafetyCheck {
	return { allowed: false, reasons: [reason], warnings };
}

function allowed(warnings: string[] = [], requiresConfirmation = false): SkillSafetyCheck {
	return { allowed: true, reasons: [], warnings, requiresConfirmation };
}

export class SkillSafetyPolicy implements SkillSafetyPolicyPort {
	constructor(
		private readonly options: {
			maxDepth?: number;
			disallowedTools?: string[];
			disallowedConnectors?: string[];
		} = {}
	) {}

	async checkBeforeExecution(
		skill: SkillDefinition,
		input: unknown,
		context: SkillExecutionRequestContext
	): Promise<SkillSafetyCheck> {
		const maxDepth = context.maxDepth ?? this.options.maxDepth ?? 4;
		if (!skill.enabled) return denied(`Skill is disabled: ${skill.id}`);
		if (context.skillDepth > maxDepth) return denied(`Skill depth exceeds limit ${maxDepth}`);
		if (context.provenanceChain.some((item) => item.skillId === skill.id)) {
			return denied(`Recursive skill execution blocked: ${skill.id}`);
		}

		const missingTools = skill.requiredTools.filter((tool) => !context.allowedTools.has(tool));
		if (missingTools.length > 0) return denied(`Missing tools: ${missingTools.join(', ')}`);

		const missingConnectors = skill.requiredConnectors.filter(
			(connector) => !context.allowedConnectors.has(connector)
		);
		if (missingConnectors.length > 0) {
			return denied(`Missing connectors: ${missingConnectors.join(', ')}`);
		}

		if (typeof input === 'string' && INJECTION_PATTERN.test(input)) {
			return denied('Potential prompt-injection content in skill input');
		}

		const serialized = JSON.stringify(input ?? {});
		const warnings = INJECTION_PATTERN.test(serialized)
			? ['Skill input contains prompt-injection-like text; treat external data as untrusted.']
			: [];
		return allowed(warnings, false);
	}

	async checkToolUse(
		skill: SkillDefinition,
		toolName: string,
		_args: unknown,
		context: SkillExecutionRequestContext
	): Promise<SkillSafetyCheck> {
		if (this.options.disallowedTools?.includes(toolName)) {
			return denied(`Tool is globally disallowed: ${toolName}`);
		}
		if (!context.allowedTools.has(toolName)) return denied(`Tool is unavailable: ${toolName}`);
		const allowedTools = new Set([...skill.requiredTools, ...skill.contract.allowedTools]);
		if (!allowedTools.has(toolName)) return denied(`Skill is not allowed to use tool: ${toolName}`);
		return allowed();
	}

	async checkConnectorUse(
		skill: SkillDefinition,
		connectorId: string,
		toolName: string,
		_args: unknown,
		context: SkillExecutionRequestContext
	): Promise<SkillSafetyCheck> {
		if (this.options.disallowedConnectors?.includes(connectorId)) {
			return denied(`Connector is globally disallowed: ${connectorId}`);
		}
		const connector = context.allowedConnectors.get(connectorId);
		if (!connector) return denied(`Connector is unavailable: ${connectorId}`);
		const allowedConnectors = new Set([
			...skill.requiredConnectors,
			...skill.contract.allowedConnectors,
		]);
		if (!allowedConnectors.has(connectorId)) {
			return denied(`Skill is not allowed to use connector: ${connectorId}`);
		}
		if (!connector.tools.has(toolName)) {
			return denied(`Connector tool is unavailable: ${connectorId}.${toolName}`);
		}
		return allowed();
	}
}
