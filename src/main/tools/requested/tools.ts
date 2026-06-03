import type { AgentTool } from '../base/tool';
import { closeAgentTool } from './close';
import { createGoalTool } from './create';
import { execCommandTool } from './exec';
import { getGoalTool } from './get';
import { hostProvidedTool } from './host';
import { imageGenerateTool } from './image';
import { requestUserInputTool } from './input';
import { parallelTool } from './parallel';
import { applyPatchTool } from './patch';
import { updatePlanTool } from './plan';
import { readMcpResourceTool } from './read';
import { resourcesTool } from './resources';
import { resumeAgentTool } from './resume';
import { toolSearchTool } from './search';
import { sendInputTool } from './send';
import { spawnAgentTool } from './spawn';
import { writeStdinTool } from './stdin';
import { templatesTool } from './templates';
import { updateGoalTool } from './update';
import { viewImageTool } from './view';
import { waitAgentTool } from './wait';
import { webRunTool } from './web';

const requestedToolDefinitions = [
	webRunTool,
	imageGenerateTool,
	execCommandTool,
	writeStdinTool,
	applyPatchTool,
	viewImageTool,
	updatePlanTool,
	getGoalTool,
	createGoalTool,
	updateGoalTool,
	resourcesTool,
	templatesTool,
	readMcpResourceTool,
	requestUserInputTool,
	parallelTool,
	toolSearchTool,
	spawnAgentTool,
	resumeAgentTool,
	sendInputTool,
	waitAgentTool,
	closeAgentTool,
] as const;

export const requestedTools = requestedToolDefinitions.map((definition) => ({
	...definition,
	execute: hostProvidedTool,
})) as readonly AgentTool[];
