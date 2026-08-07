import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { ModelInputSchema } from '@shared/model_types';
import { SettingsRow } from '@pages/settings/components';

interface ModelOptionsProps {
	readonly inputs: Readonly<Record<string, ModelInputSchema>>;
	readonly values: Readonly<Record<string, unknown>>;
	readonly onChange: (path: readonly string[], value: unknown) => void;
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

export function ModelOptions({
	inputs,
	values,
	onChange,
}: ModelOptionsProps): React.JSX.Element | null {
	const entries: Array<{ path: string[]; schema: ModelInputSchema }> = [];
	const pending = Object.entries(inputs).map(([key, schema]) => ({ path: [key], schema }));
	while (pending.length > 0) {
		const entry = pending.shift();
		if (!entry || RESERVED_INPUTS.has(entry.path[0])) continue;
		if (entry.schema.type === 'object' && entry.schema.properties) {
			pending.unshift(
				...Object.entries(entry.schema.properties).map(([key, schema]) => ({
					path: [...entry.path, key],
					schema,
				}))
			);
			continue;
		}
		if (
			entry.schema.type === 'string' ||
			entry.schema.type === 'number' ||
			entry.schema.type === 'integer' ||
			entry.schema.type === 'boolean'
		) {
			entries.push(entry);
		}
	}
	if (entries.length === 0) return null;

	return (
		<div className="-mx-3 -mb-3 mt-1 border-t border-border/60">
			{entries.map(({ path, schema }) => {
				let value: unknown = values;
				for (const key of path) {
					value =
						value && typeof value === 'object'
							? (value as Record<string, unknown>)[key]
							: undefined;
				}
				const key = path.join('.');
				const label =
					schema.title ?? path.map((part) => part.replaceAll('_', ' ')).join(' ');
				const choices =
					schema.oneOf?.map((choice) => ({
						label: choice.title ?? String(choice.const),
						value: choice.const,
					})) ??
					schema.enum?.map((choice) => ({ label: String(choice), value: choice })) ??
					[];
				if (choices.length > 0) {
					const selectedIndex = choices.findIndex((choice) => Object.is(choice.value, value));
					return (
						<SettingsRow
							key={key}
							title={label}
							actions={
								<Select
									value={selectedIndex < 0 ? '__default__' : String(selectedIndex)}
									onValueChange={(next) =>
										onChange(
											path,
											next === '__default__' ? undefined : choices[Number(next)]?.value
										)
									}
								>
									<SelectTrigger className="w-40">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__default__">Provider default</SelectItem>
										{choices.map((choice, index) => (
											<SelectItem key={`${String(choice.value)}-${index}`} value={String(index)}>
												{choice.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							}
						/>
					);
				}
				if (schema.type === 'boolean') {
					return (
						<SettingsRow
							key={key}
							title={label}
							actions={
								<Switch
									checked={value === true}
									onCheckedChange={(checked) => onChange(path, checked)}
								/>
							}
						/>
					);
				}
				const numeric = schema.type === 'number' || schema.type === 'integer';
				return (
					<SettingsRow
						key={key}
						title={label}
						actions={
							<Input
								className="w-40"
								type={numeric ? 'number' : 'text'}
								min={schema.minimum}
								max={schema.maximum}
								step={schema.type === 'integer' ? 1 : undefined}
								value={
									typeof value === 'string' || typeof value === 'number' ? String(value) : ''
								}
								onChange={(event) =>
									onChange(
										path,
										event.target.value === ''
											? undefined
											: numeric
												? Number(event.target.value)
												: event.target.value
									)
								}
							/>
						}
					/>
				);
			})}
		</div>
	);
}
