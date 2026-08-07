import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@pages/settings/components';

interface ModelOptionsProps {
	readonly inputs: Readonly<Record<string, unknown>>;
	readonly values: Readonly<Record<string, unknown>>;
	readonly onChange: (key: string, value: unknown) => void;
}

const RESERVED_INPUTS = new Set([
	'max_tokens',
	'maxOutputTokens',
	'metadata',
	'stream',
	'stream_options',
	'tool_choice',
	'tools',
]);

export function ModelOptions({ inputs, values, onChange }: ModelOptionsProps): React.JSX.Element | null {
	const entries = Object.entries(inputs).filter(([key, schema]) => {
		if (RESERVED_INPUTS.has(key)) return false;
		const type = (schema as { type?: string }).type;
		return type === 'string' || type === 'number' || type === 'integer' || type === 'boolean';
	});
	if (entries.length === 0) return null;

	return (
		<div className="-mx-3 -mb-3 mt-1 border-t border-border/60">
			{entries.map(([key, schema]) => {
				const definition = schema as {
					type?: string;
					enum?: unknown[];
					minimum?: number;
					maximum?: number;
				};
				const value = values[key];
				const label = key.replaceAll('_', ' ');
				if (definition.type === 'boolean') {
					return (
						<SettingsRow
							key={key}
							title={label}
							actions={<Switch checked={value === true} onCheckedChange={(checked) => onChange(key, checked)} />}
						/>
					);
				}
				if (definition.enum?.every((item) => typeof item === 'string')) {
					return (
						<SettingsRow
							key={key}
							title={label}
							actions={
								<Select value={typeof value === 'string' ? value : undefined} onValueChange={(next) => onChange(key, next)}>
									<SelectTrigger className="w-40"><SelectValue placeholder="Default" /></SelectTrigger>
									<SelectContent>
										{definition.enum.map((item) => <SelectItem key={String(item)} value={String(item)}>{String(item)}</SelectItem>)}
									</SelectContent>
								</Select>
							}
						/>
					);
				}
				const numeric = definition.type === 'number' || definition.type === 'integer';
				return (
					<SettingsRow
						key={key}
						title={label}
						actions={
							<Input
								className="w-40"
								type={numeric ? 'number' : 'text'}
								min={definition.minimum}
								max={definition.maximum}
								value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
								onChange={(event) => onChange(key, event.target.value === '' ? undefined : numeric ? Number(event.target.value) : event.target.value)}
							/>
						}
					/>
				);
			})}
		</div>
	);
}
