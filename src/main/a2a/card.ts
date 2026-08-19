import type { AgentCard } from '@a2a-js/sdk';

export function createAgentCard(publicUrl: string): AgentCard {
	return {
		name: 'Idra',
		description: 'A personal assistant that can work with files in its private workspace.',
		supportedInterfaces: [
			{
				url: `${publicUrl}/a2a`,
				protocolBinding: 'HTTP+JSON',
				protocolVersion: '1.0',
				tenant: '',
			},
		],
		provider: undefined,
		version: '1.0.2',
		capabilities: {
			streaming: true,
			pushNotifications: false,
			extendedAgentCard: false,
			extensions: [],
		},
		securitySchemes: {
			bearerAuth: {
				scheme: {
					$case: 'httpAuthSecurityScheme',
					value: {
						description: 'Dedicated Idra agent token.',
						scheme: 'Bearer',
						bearerFormat: '',
					},
				},
			},
		},
		securityRequirements: [{ schemes: { bearerAuth: { list: [] } } }],
		defaultInputModes: ['text/plain'],
		defaultOutputModes: ['text/plain'],
		skills: [
			{
				id: 'workspace-assistance',
				name: 'Workspace assistance',
				description: 'Answer questions and read, create, or edit files in a private workspace.',
				tags: ['assistant', 'files', 'workspace'],
				examples: ['Summarize the files in the workspace.'],
				inputModes: ['text/plain'],
				outputModes: ['text/plain'],
				securityRequirements: [],
			},
		],
		signatures: [],
	};
}
