export type HarnessLayerId = 'core' | 'runtime' | 'capabilities' | 'safety_scale';

export type HarnessComponentId =
	| 'stateless_model'
	| 'prompt_composer'
	| 'agent_loop'
	| 'output_parser'
	| 'error_recovery'
	| 'model_router'
	| 'tool_registry'
	| 'mcp_boundary'
	| 'skills'
	| 'context_engineering'
	| 'memory'
	| 'sessions'
	| 'guardrails'
	| 'verification'
	| 'observability'
	| 'subagents'
	| 'permissions'
	| 'sandbox';

export type ControlDirection = 'guide' | 'sensor';

export type ControlMechanism = 'computational' | 'inferential';

export interface HarnessComponent {
	id: HarnessComponentId;
	name: string;
	summary: string;
	controls: ControlLabel[];
}

export interface HarnessLayer {
	id: HarnessLayerId;
	name: string;
	summary: string;
	components: HarnessComponent[];
}

export interface ControlLabel {
	direction: ControlDirection;
	mechanism: ControlMechanism;
	examples: string[];
}

export interface LoopPhase {
	order: number;
	id: string;
	name: string;
	summary: string;
	primaryControl: ControlLabel;
}

export interface SafetyLayer {
	order: number;
	name: string;
	summary: string;
	control: ControlLabel;
}

export interface HarnessReference {
	formula: 'Agent = Model + Harness';
	layers: HarnessLayer[];
	loop: LoopPhase[];
	safety: SafetyLayer[];
}
