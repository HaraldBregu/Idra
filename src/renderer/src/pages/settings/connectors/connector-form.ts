import type { ConnectorInput } from '../../../../../shared/connectors';

export interface ConnectorFormState {
	name: string;
	command: string;
	args: string;
	env: string;
	cwd: string;
}

export const EMPTY_CONNECTOR_FORM: ConnectorFormState = {
	name: '',
	command: '',
	args: '',
	env: '',
	cwd: '',
};

export function argsToText(args: readonly string[]): string {
	return args.join('\n');
}

export function envToText(env: Record<string, string>): string {
	return Object.entries(env)
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');
}

export function parseConnectorForm(form: ConnectorFormState): ConnectorInput {
	return {
		name: form.name,
		transport: 'stdio',
		command: form.command,
		args: form.args
			.split('\n')
			.map((arg) => arg.trim())
			.filter(Boolean),
		env: Object.fromEntries(
			form.env
				.split('\n')
				.map((line) => line.trim())
				.filter(Boolean)
				.map((line) => {
					const equalsIndex = line.indexOf('=');
					if (equalsIndex === -1) return [line, ''] as const;
					return [line.slice(0, equalsIndex).trim(), line.slice(equalsIndex + 1)] as const;
				})
				.filter(([key]) => key.length > 0)
		),
		cwd: form.cwd.trim() || undefined,
		enabled: true,
	};
}
