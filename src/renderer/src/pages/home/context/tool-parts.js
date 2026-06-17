function createAgentToolPart(toolCallId, patch) {
    return {
        toolCallId,
        type: patch.type ?? 'tool',
        state: patch.state ?? 'input-streaming',
        iteration: patch.iteration,
        input: patch.input,
        inputText: patch.inputText,
        output: patch.output,
        outputText: patch.outputText,
        durationMs: patch.durationMs,
        errorText: patch.errorText,
        status: patch.status,
    };
}
export function updateAgentToolPart(tools, toolCallId, patch) {
    const index = tools.findIndex((tool) => tool.toolCallId === toolCallId);
    if (index === -1) {
        return [...tools, createAgentToolPart(toolCallId, patch)];
    }
    return tools.map((tool, currentIndex) => currentIndex === index ? { ...tool, ...patch, toolCallId } : tool);
}
export function applyAgentResponseEventToTools(tools, event) {
    switch (event.type) {
        case 'run_state':
        case 'reasoning_summary':
        case 'text_delta':
            return undefined;
        case 'tool_call_start':
            return updateAgentToolPart(tools, event.toolCallId, {
                type: event.toolName,
                state: 'input-streaming',
                iteration: event.iteration,
                inputText: '',
            });
        case 'tool_call_args_delta':
            return updateAgentToolPart(tools, event.toolCallId, {
                type: event.toolName,
                displayName: event.displayName,
                serviceKind: event.serviceKind,
                serviceId: event.serviceId,
                state: 'input-streaming',
                iteration: event.iteration,
                inputText: event.argsText,
            });
        case 'tool_call_input':
            return updateAgentToolPart(tools, event.toolCallId, {
                type: event.toolName,
                displayName: event.displayName,
                serviceKind: event.serviceKind,
                serviceId: event.serviceId,
                state: 'input-available',
                iteration: event.iteration,
                input: event.input,
                inputText: event.argsText,
            });
        case 'tool_call_result': {
            const isError = event.status !== 'ok';
            const errorText = event.errorText ?? (isError ? event.outputText || 'Tool call failed.' : undefined);
            return updateAgentToolPart(tools, event.toolCallId, {
                type: event.toolName,
                state: isError ? 'output-error' : 'output-available',
                iteration: event.iteration,
                input: event.input,
                output: event.output,
                outputText: event.outputText,
                durationMs: event.durationMs,
                errorText,
                status: event.status,
            });
        }
        default:
            return undefined;
    }
}
export function agentToolPartFromHistoryBlock(block) {
    if (block.type !== 'tool_use')
        return undefined;
    return {
        toolCallId: block.toolUseId,
        type: block.toolName,
        state: 'input-available',
        input: block.toolArgs ?? {},
    };
}
