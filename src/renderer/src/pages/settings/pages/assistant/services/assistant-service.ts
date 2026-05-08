export interface AssistantReply {
	readonly content: string;
}

export async function sendMessage(prompt: string): Promise<AssistantReply> {
	const content = await window.app.assistant.send(prompt);
	return { content };
}

export function resetConversation(): Promise<void> {
	return window.app.assistant.reset();
}

export function onAssistantResponse(
	callback: (reply: AssistantReply) => void
): () => void {
	return window.app.assistant.onResponse((event) => {
		callback({ content: event.response });
	});
}
