import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@pages/settings/components';

interface ModelOptionsProps {
	readonly inputs: Readonly<Record<string, unknown>>;
	readonly values: Readonly<Record<string, unknown>>;
	readonly onChange: (key: string, value: unknown) => void;
}

export function ModelOptions({ inputs, values, onChange }: ModelOptionsProps): React.JSX.Element | null {
	if (Object.keys(inputs).length === 0) return null;

	return (
		<div className="-mx-3 -mb-3 mt-1 border-t border-border/60">
			{Object.entries(inputs).map(([key, schema]) => {
				const definition = schema as { type?: string; enum?: unknown[] };
				const value = values[key];
				if (definition.type === 'object') return null;
				if (definition.type === 'boolean') {
					return (
						<SettingsRow
							key={key}
							title={key}
							actions={<Switch checked={value === true} onCheckedChange={(checked) => onChange(key, checked)} />}
						/>
					);
				}
				if (definition.enum?.every((item) => typeof item === 'string')) {
					return (
						<SettingsRow
							key={key}
							title={key}
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
						title={key}
						actions={
							<Input
								className="w-40"
								type={numeric ? 'number' : 'text'}
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
