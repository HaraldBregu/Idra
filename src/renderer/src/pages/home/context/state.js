export const welcomeMessage = {
    id: 'agent-welcome',
    role: 'agent',
    type: 'agent',
    content: 'Ready when you are. Ask Friday to inspect code, make a change, explain a file, or help plan the next step.',
    state: 'idle',
    tools: [],
};
export const initialAgentChatState = {
    messages: [welcomeMessage],
};
