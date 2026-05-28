export type BeforeAgentRunHook = (input: { message: string; agentId: string; sessionId: string }) => void | Promise<void>;

export async function evaluateBeforeAgentRunHooks(hooks: BeforeAgentRunHook[], input: { message: string; agentId: string; sessionId: string }): Promise<void> {
	for (const hook of hooks) await hook(input);
}
