import { ToolService } from './service';
export function planToolConstruction() {
	return { tools: [] };
}
export function createAgentTools() {
	return new ToolService().createDefaultTools({});
}
